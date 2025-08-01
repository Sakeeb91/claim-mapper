"""
Quality assessment service for evaluating claim confidence and reliability
"""

import asyncio
from typing import List, Dict, Optional, Tuple
import numpy as np
import spacy
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from textblob import TextBlob
import re
from loguru import logger
from collections import Counter
import math

from models.schemas import ExtractedClaim, ClaimType


class QualityMetrics:
    """Container for quality assessment metrics"""
    def __init__(self):
        self.overall_score = 0.0
        self.confidence_score = 0.0
        self.clarity_score = 0.0
        self.specificity_score = 0.0
        self.evidence_score = 0.0
        self.bias_score = 0.0
        self.factuality_score = 0.0
        self.completeness_score = 0.0
        self.reasoning_score = 0.0
        self.source_reliability = 0.0
        
        # Detailed breakdowns
        self.linguistic_features = {}
        self.structural_features = {}
        self.semantic_features = {}
        self.issues = []
        self.recommendations = []


class QualityScorer:
    """Service for assessing claim quality and reliability"""
    
    def __init__(self):
        self.nlp = None
        self.sentiment_analyzer = None
        self.factuality_checker = None
        self.bias_detector = None
        self.readability_analyzer = None
        
        # Quality assessment criteria
        self.quality_criteria = {
            'clarity': {
                'readability': 0.3,
                'sentence_structure': 0.3,
                'terminology': 0.2,
                'coherence': 0.2
            },
            'specificity': {
                'precision': 0.4,
                'quantification': 0.3,
                'detail_level': 0.3
            },
            'evidence': {
                'source_quality': 0.4,
                'evidence_strength': 0.3,
                'citation_quality': 0.3
            },
            'bias': {
                'language_bias': 0.4,
                'selection_bias': 0.3,
                'confirmation_bias': 0.3
            }
        }
        
        # Initialize models
        asyncio.create_task(self._load_models())
    
    async def _load_models(self):
        """Load all required models for quality scoring"""
        try:
            logger.info("Loading quality scoring models...")
            
            # Load spaCy for linguistic analysis
            self.nlp = spacy.load("en_core_web_sm")
            
            # Load sentiment analysis pipeline
            self.sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                return_all_scores=True
            )
            
            # Load factuality checker
            self.factuality_checker = pipeline(
                "text-classification",
                model="facebook/bart-large-mnli",
                return_all_scores=True
            )
            
            # Load bias detection pipeline
            self.bias_detector = pipeline(
                "text-classification",
                model="martin-ha/toxic-comment-model",
                return_all_scores=True
            )
            
            logger.info("Quality scoring models loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load quality scoring models: {e}")
            raise
    
    async def assess_claim_quality(
        self,
        claim: ExtractedClaim,
        context: str = "",
        source_info: Optional[Dict] = None,
        evidence: Optional[List[str]] = None
    ) -> QualityMetrics:
        """Assess the overall quality of a claim"""
        
        try:
            metrics = QualityMetrics()
            
            # Assess different quality dimensions
            metrics.confidence_score = await self._assess_confidence(claim, context)
            metrics.clarity_score = await self._assess_clarity(claim.text)
            metrics.specificity_score = await self._assess_specificity(claim.text)
            metrics.evidence_score = await self._assess_evidence_quality(claim, evidence or [])
            metrics.bias_score = await self._assess_bias(claim.text)
            metrics.factuality_score = await self._assess_factuality(claim.text)
            metrics.completeness_score = await self._assess_completeness(claim.text, context)
            metrics.reasoning_score = await self._assess_reasoning_quality(claim.text, context)
            metrics.source_reliability = await self._assess_source_reliability(source_info)
            
            # Extract detailed features
            metrics.linguistic_features = await self._extract_linguistic_features(claim.text)
            metrics.structural_features = await self._extract_structural_features(claim.text)
            metrics.semantic_features = await self._extract_semantic_features(claim.text)
            
            # Calculate overall quality score
            weights = {
                'confidence': 0.15,
                'clarity': 0.15,
                'specificity': 0.12,
                'evidence': 0.18,
                'bias': 0.10,
                'factuality': 0.15,
                'completeness': 0.08,
                'reasoning': 0.05,
                'source': 0.02
            }
            
            metrics.overall_score = (
                metrics.confidence_score * weights['confidence'] +
                metrics.clarity_score * weights['clarity'] +
                metrics.specificity_score * weights['specificity'] +
                metrics.evidence_score * weights['evidence'] +
                (1.0 - metrics.bias_score) * weights['bias'] +  # Lower bias is better
                metrics.factuality_score * weights['factuality'] +
                metrics.completeness_score * weights['completeness'] +
                metrics.reasoning_score * weights['reasoning'] +
                metrics.source_reliability * weights['source']
            )
            
            # Identify issues and generate recommendations
            metrics.issues = await self._identify_quality_issues(metrics)
            metrics.recommendations = await self._generate_recommendations(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Quality assessment failed: {e}")
            return QualityMetrics()
    
    async def _assess_confidence(self, claim: ExtractedClaim, context: str) -> float:
        """Assess confidence level of the claim"""
        try:
            confidence_indicators = {
                'high_confidence': [
                    'proven', 'demonstrated', 'established', 'confirmed', 'verified',
                    'conclusive', 'definitive', 'certain', 'undeniable', 'fact'
                ],
                'medium_confidence': [
                    'evidence suggests', 'indicates', 'shows', 'research shows',
                    'studies indicate', 'data suggests', 'findings show'
                ],
                'low_confidence': [
                    'might', 'could', 'may', 'possibly', 'perhaps', 'seems',
                    'appears', 'suggests', 'implies', 'potentially'
                ],
                'uncertainty': [
                    'unclear', 'uncertain', 'ambiguous', 'debatable', 'controversial',
                    'disputed', 'questionable', 'unconfirmed', 'alleged'
                ]
            }
            
            text_lower = claim.text.lower()
            
            # Score based on confidence indicators
            high_count = sum(1 for phrase in confidence_indicators['high_confidence'] if phrase in text_lower)
            medium_count = sum(1 for phrase in confidence_indicators['medium_confidence'] if phrase in text_lower)
            low_count = sum(1 for phrase in confidence_indicators['low_confidence'] if phrase in text_lower)
            uncertainty_count = sum(1 for phrase in confidence_indicators['uncertainty'] if phrase in text_lower)
            
            # Calculate confidence score
            confidence_score = (
                high_count * 1.0 +
                medium_count * 0.7 +
                low_count * 0.4 +
                uncertainty_count * 0.1
            ) / max(1, high_count + medium_count + low_count + uncertainty_count)
            
            # Adjust based on claim type
            if claim.type == ClaimType.HYPOTHESIS:
                confidence_score *= 0.8  # Hypotheses are inherently less certain
            elif claim.type == ClaimType.QUESTION:
                confidence_score *= 0.5  # Questions don't make confident claims
            
            # Factor in model confidence
            model_confidence = claim.confidence if hasattr(claim, 'confidence') else 0.7
            
            return min(1.0, (confidence_score + model_confidence) / 2)
            
        except Exception as e:
            logger.error(f"Confidence assessment failed: {e}")
            return 0.5
    
    async def _assess_clarity(self, text: str) -> float:
        """Assess clarity and readability of the claim"""
        try:
            doc = self.nlp(text)
            
            # Readability metrics
            sentence_count = len(list(doc.sents))
            word_count = len([token for token in doc if not token.is_punct])
            
            if sentence_count == 0 or word_count == 0:
                return 0.0
            
            avg_sentence_length = word_count / sentence_count
            
            # Flesch Reading Ease approximation
            syllable_count = sum(self._count_syllables(token.text) for token in doc if token.is_alpha)
            if word_count > 0 and sentence_count > 0:
                flesch_score = 206.835 - (1.015 * avg_sentence_length) - (84.6 * syllable_count / word_count)
                readability_score = max(0, min(100, flesch_score)) / 100
            else:
                readability_score = 0.5
            
            # Sentence structure complexity
            complex_structures = 0
            for sent in doc.sents:
                # Count subordinate clauses, passive voice, etc.
                if any(token.dep_ in ['csubj', 'ccomp', 'advcl'] for token in sent):
                    complex_structures += 1
            
            structure_score = max(0, 1.0 - (complex_structures / max(1, sentence_count)) * 0.5)
            
            # Terminology clarity (fewer technical terms = higher clarity)
            technical_terms = 0
            for token in doc:
                if token.pos_ == 'NOUN' and len(token.text) > 8:  # Long nouns often technical
                    technical_terms += 1
            
            terminology_score = max(0, 1.0 - (technical_terms / max(1, word_count)) * 2)
            
            # Overall clarity score
            clarity_score = (
                readability_score * 0.4 +
                structure_score * 0.3 +
                terminology_score * 0.3
            )
            
            return min(1.0, clarity_score)
            
        except Exception as e:
            logger.error(f"Clarity assessment failed: {e}")
            return 0.5
    
    def _count_syllables(self, word: str) -> int:
        """Count syllables in a word (approximation)"""
        word = word.lower()
        if not word:
            return 0
        
        vowels = 'aeiouy'
        syllable_count = 0
        prev_was_vowel = False
        
        for char in word:
            if char in vowels:
                if not prev_was_vowel:
                    syllable_count += 1
                prev_was_vowel = True
            else:
                prev_was_vowel = False
        
        # Handle silent e
        if word.endswith('e'):
            syllable_count -= 1
        
        return max(1, syllable_count)
    
    async def _assess_specificity(self, text: str) -> float:
        """Assess how specific and precise the claim is"""
        try:
            doc = self.nlp(text)
            
            # Count specific elements
            numbers = len([token for token in doc if token.like_num])
            dates = len([ent for ent in doc.ents if ent.label_ in ['DATE', 'TIME']])
            organizations = len([ent for ent in doc.ents if ent.label_ == 'ORG'])
            people = len([ent for ent in doc.ents if ent.label_ == 'PERSON'])
            locations = len([ent for ent in doc.ents if ent.label_ in ['GPE', 'LOC']])
            
            # Quantitative terms
            quantitative_terms = [
                'percent', 'percentage', 'ratio', 'rate', 'correlation', 'significant',
                'study', 'research', 'data', 'analysis', 'measurement', 'experiment'
            ]
            quant_count = sum(1 for term in quantitative_terms if term in text.lower())
            
            # Vague terms (reduce specificity)
            vague_terms = [
                'some', 'many', 'several', 'various', 'numerous', 'often', 'sometimes',
                'generally', 'usually', 'mostly', 'largely', 'somewhat', 'quite'
            ]
            vague_count = sum(1 for term in vague_terms if term in text.lower())
            
            # Calculate specificity score
            word_count = len([token for token in doc if not token.is_punct])
            if word_count == 0:
                return 0.0
            
            specific_elements = numbers * 2 + dates * 1.5 + organizations + people + locations + quant_count
            specificity_score = (specific_elements / word_count) * 10  # Scale up
            specificity_score -= (vague_count / word_count) * 5  # Penalize vague terms
            
            return max(0.0, min(1.0, specificity_score))
            
        except Exception as e:
            logger.error(f"Specificity assessment failed: {e}")
            return 0.5
    
    async def _assess_evidence_quality(self, claim: ExtractedClaim, evidence: List[str]) -> float:
        """Assess the quality of supporting evidence"""
        try:
            if not evidence:
                return 0.1  # No evidence provided
            
            evidence_scores = []
            
            for evidence_text in evidence:
                # Assess individual evidence quality
                doc = self.nlp(evidence_text)
                
                # Source quality indicators
                source_indicators = [
                    'study', 'research', 'experiment', 'analysis', 'survey',
                    'journal', 'published', 'peer-reviewed', 'data', 'statistics'
                ]
                source_score = sum(1 for indicator in source_indicators if indicator in evidence_text.lower())
                
                # Quantitative evidence
                numbers = len([token for token in doc if token.like_num])
                dates = len([ent for ent in doc.ents if ent.label_ in ['DATE', 'TIME']])
                
                # Evidence strength
                strength_indicators = [
                    'significant', 'conclusive', 'demonstrated', 'proven', 'confirmed',
                    'correlation', 'p-value', 'confidence interval', 'effect size'
                ]
                strength_score = sum(1 for indicator in strength_indicators if indicator in evidence_text.lower())
                
                # Calculate evidence piece score
                piece_score = (source_score * 0.4 + (numbers + dates) * 0.3 + strength_score * 0.3) / 5
                evidence_scores.append(min(1.0, piece_score))
            
            # Overall evidence quality
            avg_evidence_quality = np.mean(evidence_scores)
            evidence_quantity_bonus = min(0.2, len(evidence) * 0.1)  # Bonus for multiple evidence pieces
            
            return min(1.0, avg_evidence_quality + evidence_quantity_bonus)
            
        except Exception as e:
            logger.error(f"Evidence quality assessment failed: {e}")
            return 0.3
    
    async def _assess_bias(self, text: str) -> float:
        """Assess potential bias in the claim"""
        try:
            # Language bias indicators
            bias_indicators = {
                'emotional': [
                    'amazing', 'terrible', 'fantastic', 'awful', 'incredible', 'shocking',
                    'outrageous', 'brilliant', 'catastrophic', 'devastating'
                ],
                'absolute': [
                    'always', 'never', 'all', 'none', 'every', 'no one', 'everyone',
                    'completely', 'totally', 'absolutely', 'perfectly'
                ],
                'loaded': [
                    'obviously', 'clearly', 'undoubtedly', 'certainly', 'definitely',
                    'surely', 'of course', 'needless to say'
                ]
            }
            
            text_lower = text.lower()
            bias_score = 0.0
            
            for bias_type, indicators in bias_indicators.items():
                count = sum(1 for indicator in indicators if indicator in text_lower)
                if bias_type == 'emotional':
                    bias_score += count * 0.3
                elif bias_type == 'absolute':
                    bias_score += count * 0.2
                elif bias_type == 'loaded':
                    bias_score += count * 0.1
            
            # Sentiment analysis for emotional bias
            sentiment_result = self.sentiment_analyzer(text)
            if sentiment_result:
                sentiment_scores = {item['label']: item['score'] for item in sentiment_result[0]}
                # High positive or negative sentiment indicates potential bias
                max_sentiment = max(sentiment_scores.values())
                if max_sentiment > 0.8:
                    bias_score += 0.2
            
            # Normalize bias score
            word_count = len(text.split())
            normalized_bias = bias_score / max(1, word_count) * 10
            
            return min(1.0, normalized_bias)
            
        except Exception as e:
            logger.error(f"Bias assessment failed: {e}")
            return 0.5
    
    async def _assess_factuality(self, text: str) -> float:
        """Assess the factual nature of the claim"""
        try:
            # Factual indicators
            factual_indicators = [
                'research shows', 'study found', 'data indicates', 'statistics show',
                'according to', 'published in', 'peer-reviewed', 'empirical evidence',
                'experimental results', 'clinical trial', 'meta-analysis'
            ]
            
            # Opinion indicators (reduce factuality)
            opinion_indicators = [
                'i think', 'i believe', 'in my opinion', 'personally', 'i feel',
                'seems to me', 'i suspect', 'my view', 'i would argue'
            ]
            
            text_lower = text.lower()
            
            factual_count = sum(1 for indicator in factual_indicators if indicator in text_lower)
            opinion_count = sum(1 for indicator in opinion_indicators if indicator in text_lower)
            
            # Check for verifiable elements
            doc = self.nlp(text)
            numbers = len([token for token in doc if token.like_num])
            dates = len([ent for ent in doc.ents if ent.label_ in ['DATE', 'TIME']])
            organizations = len([ent for ent in doc.ents if ent.label_ == 'ORG'])
            
            verifiable_elements = numbers + dates + organizations
            
            # Calculate factuality score
            factuality_score = (
                factual_count * 0.3 +
                verifiable_elements * 0.1 -
                opinion_count * 0.2
            )
            
            # Normalize
            word_count = len(text.split())
            normalized_factuality = factuality_score / max(1, word_count) * 20
            
            return max(0.0, min(1.0, normalized_factuality + 0.5))  # Base score of 0.5
            
        except Exception as e:
            logger.error(f"Factuality assessment failed: {e}")
            return 0.5
    
    async def _assess_completeness(self, text: str, context: str) -> float:
        """Assess how complete the claim is"""
        try:
            # Check for essential elements
            doc = self.nlp(text)
            
            has_subject = any(token.dep_ in ['nsubj', 'nsubjpass'] for token in doc)
            has_predicate = any(token.pos_ == 'VERB' for token in doc)
            has_object = any(token.dep_ in ['dobj', 'pobj'] for token in doc)
            
            # Check for context elements
            has_time_reference = any(ent.label_ in ['DATE', 'TIME'] for ent in doc.ents)
            has_location_reference = any(ent.label_ in ['GPE', 'LOC'] for ent in doc.ents)
            has_source_reference = any(ent.label_ == 'ORG' for ent in doc.ents)
            
            # Check for qualifying information
            has_conditions = any(word in text.lower() for word in ['if', 'when', 'unless', 'provided', 'assuming'])
            has_scope = any(word in text.lower() for word in ['some', 'most', 'many', 'few', 'certain'])
            
            # Calculate completeness score
            structure_score = (has_subject + has_predicate + has_object) / 3
            context_score = (has_time_reference + has_location_reference + has_source_reference) / 3
            qualification_score = (has_conditions + has_scope) / 2
            
            completeness_score = (
                structure_score * 0.5 +
                context_score * 0.3 +
                qualification_score * 0.2
            )
            
            return completeness_score
            
        except Exception as e:
            logger.error(f"Completeness assessment failed: {e}")
            return 0.5
    
    async def _assess_reasoning_quality(self, text: str, context: str) -> float:
        """Assess the quality of reasoning in the claim"""
        try:
            # Logical connectors
            logical_connectors = [
                'because', 'therefore', 'thus', 'hence', 'consequently', 'as a result',
                'since', 'due to', 'owing to', 'given that', 'considering that'
            ]
            
            # Causal language
            causal_language = [
                'causes', 'leads to', 'results in', 'brings about', 'produces',
                'triggers', 'influences', 'affects', 'impacts', 'contributes to'
            ]
            
            text_lower = text.lower()
            
            logical_count = sum(1 for connector in logical_connectors if connector in text_lower)
            causal_count = sum(1 for phrase in causal_language if phrase in text_lower)
            
            # Check for evidence-based reasoning
            evidence_phrases = [
                'based on', 'according to', 'evidence shows', 'research indicates',
                'studies demonstrate', 'data suggests', 'analysis reveals'
            ]
            evidence_count = sum(1 for phrase in evidence_phrases if phrase in text_lower)
            
            # Calculate reasoning score
            word_count = len(text.split())
            reasoning_elements = logical_count + causal_count + evidence_count
            
            reasoning_score = reasoning_elements / max(1, word_count) * 20  # Scale up
            
            return min(1.0, reasoning_score + 0.3)  # Base score of 0.3
            
        except Exception as e:
            logger.error(f"Reasoning quality assessment failed: {e}")
            return 0.5
    
    async def _assess_source_reliability(self, source_info: Optional[Dict]) -> float:
        """Assess the reliability of the source"""
        try:
            if not source_info:
                return 0.5  # Neutral score for unknown source
            
            source_type = source_info.get('type', '').lower()
            source_name = source_info.get('name', '').lower()
            
            # Source type reliability scores
            type_scores = {
                'peer-reviewed journal': 0.9,
                'academic paper': 0.85,
                'government report': 0.8,
                'research institution': 0.8,
                'news article': 0.6,
                'blog post': 0.3,
                'social media': 0.2,
                'unknown': 0.5
            }
            
            # High-quality source indicators
            quality_indicators = [
                'university', 'institute', 'journal', 'nature', 'science',
                'academic', 'research', 'peer-reviewed', 'published'
            ]
            
            base_score = type_scores.get(source_type, 0.5)
            
            # Bonus for quality indicators in source name
            quality_bonus = sum(0.1 for indicator in quality_indicators if indicator in source_name)
            
            return min(1.0, base_score + quality_bonus)
            
        except Exception as e:
            logger.error(f"Source reliability assessment failed: {e}")
            return 0.5
    
    async def _extract_linguistic_features(self, text: str) -> Dict:
        """Extract linguistic features for detailed analysis"""
        try:
            doc = self.nlp(text)
            
            features = {
                'word_count': len([token for token in doc if not token.is_punct]),
                'sentence_count': len(list(doc.sents)),
                'avg_word_length': np.mean([len(token.text) for token in doc if token.is_alpha]),
                'pos_distribution': Counter(token.pos_ for token in doc),
                'dependency_types': Counter(token.dep_ for token in doc),
                'named_entities': len(doc.ents),
                'entity_types': Counter(ent.label_ for ent in doc.ents),
                'readability_features': {
                    'syllable_count': sum(self._count_syllables(token.text) for token in doc if token.is_alpha),
                    'complex_words': len([token for token in doc if token.is_alpha and len(token.text) > 6]),
                    'passive_voice': len([token for token in doc if token.dep_ == 'nsubjpass'])
                }
            }
            
            return features
            
        except Exception as e:
            logger.error(f"Linguistic feature extraction failed: {e}")
            return {}
    
    async def _extract_structural_features(self, text: str) -> Dict:
        """Extract structural features of the claim"""
        try:
            features = {
                'character_count': len(text),
                'punctuation_count': len([char for char in text if char in '.,!?;:']),
                'question_marks': text.count('?'),
                'exclamation_marks': text.count('!'),
                'quotation_marks': text.count('"') + text.count("'"),
                'parentheses': text.count('(') + text.count(')'),
                'numbers': len(re.findall(r'\d+', text)),
                'urls': len(re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', text)),
                'capitalized_words': len(re.findall(r'\b[A-Z][A-Z]+\b', text))
            }
            
            return features
            
        except Exception as e:
            logger.error(f"Structural feature extraction failed: {e}")
            return {}
    
    async def _extract_semantic_features(self, text: str) -> Dict:
        """Extract semantic features of the claim"""
        try:
            # Sentiment analysis
            sentiment_result = self.sentiment_analyzer(text)
            sentiment_scores = {}
            if sentiment_result:
                sentiment_scores = {item['label']: item['score'] for item in sentiment_result[0]}
            
            # Subjectivity analysis using TextBlob
            blob = TextBlob(text)
            
            features = {
                'sentiment_scores': sentiment_scores,
                'polarity': blob.sentiment.polarity,
                'subjectivity': blob.sentiment.subjectivity,
                'semantic_categories': {
                    'temporal': len(re.findall(r'\b(now|then|today|yesterday|tomorrow|recently|currently)\b', text.lower())),
                    'causal': len(re.findall(r'\b(because|since|due to|caused by|results in|leads to)\b', text.lower())),
                    'comparative': len(re.findall(r'\b(more|less|better|worse|higher|lower|increased|decreased)\b', text.lower())),
                    'quantitative': len(re.findall(r'\b(percent|percentage|number|amount|rate|ratio|significant)\b', text.lower()))
                }
            }
            
            return features
            
        except Exception as e:
            logger.error(f"Semantic feature extraction failed: {e}")
            return {}
    
    async def _identify_quality_issues(self, metrics: QualityMetrics) -> List[str]:
        """Identify specific quality issues"""
        issues = []
        
        try:
            if metrics.confidence_score < 0.5:
                issues.append("Low confidence indicators - claim may be speculative")
            
            if metrics.clarity_score < 0.6:
                issues.append("Poor clarity - complex sentence structure or terminology")
            
            if metrics.specificity_score < 0.4:
                issues.append("Lacks specificity - too vague or general")
            
            if metrics.evidence_score < 0.3:
                issues.append("Insufficient evidence - lacks supporting data or sources")
            
            if metrics.bias_score > 0.6:
                issues.append("Potential bias detected - emotional or loaded language")
            
            if metrics.factuality_score < 0.5:
                issues.append("Low factual content - may be opinion-based")
            
            if metrics.completeness_score < 0.5:
                issues.append("Incomplete claim - missing essential context or details")
            
            if metrics.reasoning_score < 0.4:
                issues.append("Weak reasoning - lacks logical connections or justification")
            
            return issues
            
        except Exception as e:
            logger.error(f"Issue identification failed: {e}")
            return []
    
    async def _generate_recommendations(self, metrics: QualityMetrics) -> List[str]:
        """Generate recommendations for improving claim quality"""
        recommendations = []
        
        try:
            if metrics.confidence_score < 0.6:
                recommendations.append("Add confidence qualifiers or strengthen evidence")
            
            if metrics.clarity_score < 0.7:
                recommendations.append("Simplify language and sentence structure")
            
            if metrics.specificity_score < 0.5:
                recommendations.append("Include specific numbers, dates, or entities")
            
            if metrics.evidence_score < 0.4:
                recommendations.append("Provide citations and supporting data")
            
            if metrics.bias_score > 0.5:
                recommendations.append("Use more neutral, objective language")
            
            if metrics.completeness_score < 0.6:
                recommendations.append("Add context about scope, conditions, or limitations")
            
            if metrics.reasoning_score < 0.5:
                recommendations.append("Include logical connectors and causal relationships")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Recommendation generation failed: {e}")
            return []