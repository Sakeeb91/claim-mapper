"""
Claim extraction service using transformer models
"""

import asyncio
from typing import List, Dict, Optional
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
from sentence_transformers import SentenceTransformer
import spacy
from loguru import logger

from models.schemas import ClaimExtractionResponse, ExtractedClaim, ClaimType


class ClaimExtractor:
    """Service for extracting claims from text using NLP models"""

    def __init__(self):
        self.tokenizer = None
        self.model = None
        self.similarity_model = None
        self.nlp = None
        self.claim_classifier = None
        self._initialized = False

    async def initialize(self):
        """Initialize models lazily. Call this before using the extractor."""
        if not self._initialized:
            await self._load_models()
            self._initialized = True

    async def _ensure_initialized(self):
        """Ensure models are loaded before use."""
        if not self._initialized:
            await self.initialize()
    
    async def _load_models(self):
        """Load all required models"""
        try:
            logger.info("Loading claim extraction models...")
            
            # Load spaCy for text processing
            self.nlp = spacy.load("en_core_web_sm")
            
            # Load sentence transformer for similarity
            self.similarity_model = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Load claim classification pipeline
            self.claim_classifier = pipeline(
                "text-classification",
                model="facebook/bart-large-mnli",
                return_all_scores=True
            )
            
            logger.info("Claim extraction models loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            raise
    
    async def extract_claims(
        self,
        text: str,
        source: Optional[str] = None,
        confidence_threshold: float = 0.7,
        extract_evidence: bool = True
    ) -> ClaimExtractionResponse:
        """Extract claims from input text"""
        await self._ensure_initialized()

        start_time = asyncio.get_event_loop().time()
        
        try:
            # Process text with spaCy
            doc = self.nlp(text)
            
            # Extract sentences
            sentences = [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 10]
            
            claims = []
            
            for sentence in sentences:
                # Classify if sentence contains a claim
                claim_confidence = await self._classify_claim(sentence)
                
                if claim_confidence >= confidence_threshold:
                    # Determine claim type
                    claim_type = await self._classify_claim_type(sentence)
                    
                    # Extract keywords
                    keywords = await self._extract_keywords(sentence)
                    
                    # Find related evidence if requested
                    related_evidence = []
                    if extract_evidence:
                        related_evidence = await self._find_related_evidence(
                            sentence, sentences
                        )
                    
                    # Create claim object
                    claim = ExtractedClaim(
                        text=sentence,
                        type=claim_type,
                        confidence=claim_confidence,
                        position={"start": text.find(sentence), "end": text.find(sentence) + len(sentence)},
                        keywords=keywords,
                        related_evidence=related_evidence
                    )
                    
                    claims.append(claim)
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            return ClaimExtractionResponse(
                claims=claims,
                processing_time=processing_time,
                model_version="claim-extractor-v1.0",
                metadata={
                    "source": source,
                    "sentence_count": len(sentences),
                    "confidence_threshold": confidence_threshold
                }
            )
            
        except Exception as e:
            logger.error(f"Claim extraction failed: {e}")
            raise
    
    async def _classify_claim(self, sentence: str) -> float:
        """Classify if sentence contains a claim"""
        try:
            # Use MNLI model to classify if sentence is a claim
            hypothesis = "This sentence makes a factual claim or assertion."
            
            result = self.claim_classifier(f"{sentence} [SEP] {hypothesis}")
            
            # Return confidence for "entailment" (indicates claim)
            for item in result[0]:
                if item['label'] == 'ENTAILMENT':
                    return item['score']
            
            return 0.0
            
        except Exception as e:
            logger.error(f"Claim classification failed: {e}")
            return 0.0
    
    async def _classify_claim_type(self, claim_text: str) -> ClaimType:
        """Classify the type of claim"""
        try:
            # Simple heuristic-based classification
            # In production, this would use a trained model
            
            lower_text = claim_text.lower()
            
            if any(word in lower_text for word in ['?', 'what', 'how', 'why', 'when', 'where']):
                return ClaimType.QUESTION
            
            if any(word in lower_text for word in ['hypothesis', 'theory', 'propose', 'suggest', 'might', 'could', 'may']):
                return ClaimType.HYPOTHESIS
            
            return ClaimType.ASSERTION
            
        except Exception as e:
            logger.error(f"Claim type classification failed: {e}")
            return ClaimType.ASSERTION
    
    async def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text"""
        try:
            doc = self.nlp(text)
            
            keywords = []
            for token in doc:
                if (token.pos_ in ['NOUN', 'PROPN', 'ADJ'] and 
                    not token.is_stop and 
                    not token.is_punct and 
                    len(token.text) > 2):
                    keywords.append(token.lemma_)
            
            return list(set(keywords))[:10]  # Return top 10 unique keywords
            
        except Exception as e:
            logger.error(f"Keyword extraction failed: {e}")
            return []
    
    async def _find_related_evidence(self, claim: str, sentences: List[str]) -> List[str]:
        """Find sentences that could serve as evidence for the claim"""
        try:
            if not self.similarity_model:
                return []
            
            # Compute similarities
            similarities = await self.compute_similarities(claim, sentences)
            
            # Return top 3 most similar sentences (excluding the claim itself)
            evidence = []
            for i, similarity in enumerate(similarities):
                if similarity > 0.5 and sentences[i] != claim:  # Threshold and exclude self
                    evidence.append(sentences[i])
            
            return evidence[:3]
            
        except Exception as e:
            logger.error(f"Evidence finding failed: {e}")
            return []
    
    async def compute_similarities(self, query: str, texts: List[str]) -> List[float]:
        """Compute semantic similarities between query and texts"""
        try:
            if not self.similarity_model:
                return [0.0] * len(texts)
            
            # Encode query and texts
            query_embedding = self.similarity_model.encode([query])
            text_embeddings = self.similarity_model.encode(texts)
            
            # Compute cosine similarities
            similarities = np.dot(query_embedding, text_embeddings.T)[0]
            
            return similarities.tolist()
            
        except Exception as e:
            logger.error(f"Similarity computation failed: {e}")
            return [0.0] * len(texts)