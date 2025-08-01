"""
Argument mining service for identifying claims, premises, and evidence
"""

import asyncio
from typing import List, Dict, Optional, Tuple
import numpy as np
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import spacy
from loguru import logger
import re

from models.schemas import EvidenceType


class Argument:
    """Represents an argument component"""
    def __init__(self, text: str, argument_type: str, confidence: float, position: Dict[str, int]):
        self.text = text
        self.type = argument_type  # 'claim', 'premise', 'evidence'
        self.confidence = confidence
        self.position = position
        self.relations = []  # Relations to other arguments


class ArgumentRelation:
    """Represents a relation between argument components"""
    def __init__(self, source_id: str, target_id: str, relation_type: str, confidence: float):
        self.source_id = source_id
        self.target_id = target_id
        self.type = relation_type  # 'supports', 'contradicts', 'elaborates'
        self.confidence = confidence


class ArgumentMiner:
    """Service for extracting argument structures from text"""
    
    def __init__(self):
        self.nlp = None
        self.argument_classifier = None
        self.relation_classifier = None
        self.discourse_parser = None
        
        # Initialize models
        asyncio.create_task(self._load_models())
    
    async def _load_models(self):
        """Load all required models for argument mining"""
        try:
            logger.info("Loading argument mining models...")
            
            # Load spaCy for text processing
            self.nlp = spacy.load("en_core_web_sm")
            
            # Load argument component classifier
            self.argument_classifier = pipeline(
                "text-classification",
                model="microsoft/DialoGPT-medium",
                return_all_scores=True
            )
            
            # Load relation classifier for argument relations
            self.relation_classifier = pipeline(
                "text-classification",
                model="facebook/bart-large-mnli",
                return_all_scores=True
            )
            
            logger.info("Argument mining models loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load argument mining models: {e}")
            raise
    
    async def extract_arguments(
        self,
        text: str,
        confidence_threshold: float = 0.6,
        extract_relations: bool = True
    ) -> Dict:
        """Extract argument structure from text"""
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Process text with spaCy
            doc = self.nlp(text)
            
            # Extract sentences and discourse segments
            sentences = [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 10]
            
            # Identify argument components
            arguments = []
            
            for i, sentence in enumerate(sentences):
                # Classify argument type
                arg_type, confidence = await self._classify_argument_component(sentence)
                
                if confidence >= confidence_threshold:
                    argument = Argument(
                        text=sentence,
                        argument_type=arg_type,
                        confidence=confidence,
                        position={
                            "start": text.find(sentence),
                            "end": text.find(sentence) + len(sentence),
                            "sentence_id": i
                        }
                    )
                    arguments.append(argument)
            
            # Extract relations between arguments if requested
            relations = []
            if extract_relations and len(arguments) > 1:
                relations = await self._extract_argument_relations(arguments)
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            return {
                "arguments": [
                    {
                        "id": f"arg_{i}",
                        "text": arg.text,
                        "type": arg.type,
                        "confidence": arg.confidence,
                        "position": arg.position
                    }
                    for i, arg in enumerate(arguments)
                ],
                "relations": [
                    {
                        "id": f"rel_{i}",
                        "source": rel.source_id,
                        "target": rel.target_id,
                        "type": rel.type,
                        "confidence": rel.confidence
                    }
                    for i, rel in enumerate(relations)
                ],
                "processing_time": processing_time,
                "metadata": {
                    "sentence_count": len(sentences),
                    "argument_count": len(arguments),
                    "relation_count": len(relations)
                }
            }
            
        except Exception as e:
            logger.error(f"Argument extraction failed: {e}")
            raise
    
    async def _classify_argument_component(self, sentence: str) -> Tuple[str, float]:
        """Classify the type of argument component"""
        try:
            # Use multiple classifiers to determine argument type
            
            # Check if it's a claim
            claim_hypothesis = "This sentence makes a main claim or assertion that needs support."
            claim_result = self.relation_classifier(f"{sentence} [SEP] {claim_hypothesis}")
            claim_score = max([item['score'] for item in claim_result[0] if item['label'] == 'ENTAILMENT'], default=0.0)
            
            # Check if it's a premise
            premise_hypothesis = "This sentence provides reasoning or evidence to support a claim."
            premise_result = self.relation_classifier(f"{sentence} [SEP] {premise_hypothesis}")
            premise_score = max([item['score'] for item in premise_result[0] if item['label'] == 'ENTAILMENT'], default=0.0)
            
            # Check if it's evidence
            evidence_hypothesis = "This sentence provides factual evidence, data, or empirical support."
            evidence_result = self.relation_classifier(f"{sentence} [SEP] {evidence_hypothesis}")
            evidence_score = max([item['score'] for item in evidence_result[0] if item['label'] == 'ENTAILMENT'], default=0.0)
            
            # Determine the most likely type
            scores = {
                'claim': claim_score,
                'premise': premise_score,
                'evidence': evidence_score
            }
            
            best_type = max(scores, key=scores.get)
            best_score = scores[best_type]
            
            return best_type, best_score
            
        except Exception as e:
            logger.error(f"Argument component classification failed: {e}")
            return "claim", 0.0
    
    async def _extract_argument_relations(self, arguments: List[Argument]) -> List[ArgumentRelation]:
        """Extract relations between argument components"""
        relations = []
        
        try:
            for i, arg1 in enumerate(arguments):
                for j, arg2 in enumerate(arguments):
                    if i != j:
                        relation_type, confidence = await self._classify_argument_relation(arg1, arg2)
                        
                        if confidence > 0.5:  # Threshold for relation confidence
                            relation = ArgumentRelation(
                                source_id=f"arg_{i}",
                                target_id=f"arg_{j}",
                                relation_type=relation_type,
                                confidence=confidence
                            )
                            relations.append(relation)
            
            return relations
            
        except Exception as e:
            logger.error(f"Argument relation extraction failed: {e}")
            return []
    
    async def _classify_argument_relation(self, arg1: Argument, arg2: Argument) -> Tuple[str, float]:
        """Classify the relation between two argument components"""
        try:
            # Check for support relation
            support_hypothesis = f"The first statement supports or provides evidence for the second statement."
            support_text = f"{arg1.text} [SEP] {arg2.text} [SEP] {support_hypothesis}"
            support_result = self.relation_classifier(support_text)
            support_score = max([item['score'] for item in support_result[0] if item['label'] == 'ENTAILMENT'], default=0.0)
            
            # Check for contradiction relation
            contradict_hypothesis = f"The first statement contradicts or opposes the second statement."
            contradict_text = f"{arg1.text} [SEP] {arg2.text} [SEP] {contradict_hypothesis}"
            contradict_result = self.relation_classifier(contradict_text)
            contradict_score = max([item['score'] for item in contradict_result[0] if item['label'] == 'ENTAILMENT'], default=0.0)
            
            # Check for elaboration relation
            elaborate_hypothesis = f"The first statement elaborates or explains the second statement."
            elaborate_text = f"{arg1.text} [SEP] {arg2.text} [SEP] {elaborate_hypothesis}"
            elaborate_result = self.relation_classifier(elaborate_text)
            elaborate_score = max([item['score'] for item in elaborate_result[0] if item['label'] == 'ENTAILMENT'], default=0.0)
            
            # Determine the most likely relation
            scores = {
                'supports': support_score,
                'contradicts': contradict_score,
                'elaborates': elaborate_score
            }
            
            best_relation = max(scores, key=scores.get)
            best_score = scores[best_relation]
            
            return best_relation, best_score
            
        except Exception as e:
            logger.error(f"Argument relation classification failed: {e}")
            return "supports", 0.0
    
    async def analyze_argument_structure(self, arguments: List[Dict], relations: List[Dict]) -> Dict:
        """Analyze the overall structure of arguments"""
        try:
            # Build argument graph
            argument_graph = {}
            for arg in arguments:
                argument_graph[arg['id']] = {
                    'type': arg['type'],
                    'confidence': arg['confidence'],
                    'incoming': [],
                    'outgoing': []
                }
            
            # Add relations to graph
            for rel in relations:
                if rel['source'] in argument_graph and rel['target'] in argument_graph:
                    argument_graph[rel['source']]['outgoing'].append(rel)
                    argument_graph[rel['target']]['incoming'].append(rel)
            
            # Analyze structure
            analysis = {
                'argument_count': len(arguments),
                'relation_count': len(relations),
                'claim_count': len([arg for arg in arguments if arg['type'] == 'claim']),
                'premise_count': len([arg for arg in arguments if arg['type'] == 'premise']),
                'evidence_count': len([arg for arg in arguments if arg['type'] == 'evidence']),
                'support_relations': len([rel for rel in relations if rel['type'] == 'supports']),
                'contradiction_relations': len([rel for rel in relations if rel['type'] == 'contradicts']),
                'elaboration_relations': len([rel for rel in relations if rel['type'] == 'elaborates']),
                'isolated_arguments': len([arg_id for arg_id, arg_data in argument_graph.items() 
                                         if not arg_data['incoming'] and not arg_data['outgoing']]),
                'well_supported_claims': len([arg_id for arg_id, arg_data in argument_graph.items()
                                            if arg_data['type'] == 'claim' and len(arg_data['incoming']) > 0])
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Argument structure analysis failed: {e}")
            return {}
    
    async def extract_discourse_markers(self, text: str) -> List[Dict]:
        """Extract discourse markers that indicate argument structure"""
        try:
            # Common discourse markers for argumentation
            discourse_markers = {
                'conclusion': ['therefore', 'thus', 'hence', 'consequently', 'as a result', 'in conclusion'],
                'premise': ['because', 'since', 'given that', 'as', 'for', 'due to'],
                'evidence': ['according to', 'studies show', 'research indicates', 'data suggests', 'statistics reveal'],
                'contrast': ['however', 'but', 'nevertheless', 'on the other hand', 'in contrast', 'although'],
                'support': ['furthermore', 'moreover', 'additionally', 'in addition', 'also', 'similarly']
            }
            
            doc = self.nlp(text)
            markers_found = []
            
            for marker_type, markers in discourse_markers.items():
                for marker in markers:
                    pattern = re.compile(r'\b' + re.escape(marker) + r'\b', re.IGNORECASE)
                    for match in pattern.finditer(text):
                        markers_found.append({
                            'marker': marker,
                            'type': marker_type,
                            'position': {'start': match.start(), 'end': match.end()},
                            'context': text[max(0, match.start()-50):match.end()+50]
                        })
            
            return sorted(markers_found, key=lambda x: x['position']['start'])
            
        except Exception as e:
            logger.error(f"Discourse marker extraction failed: {e}")
            return []