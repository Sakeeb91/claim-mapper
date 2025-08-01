"""
Named Entity Recognition and Relationship Extraction service
"""

import asyncio
from typing import List, Dict, Optional, Tuple, Set
import spacy
from spacy import displacy
import networkx as nx
from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification
import re
from loguru import logger
from collections import defaultdict, Counter


class Entity:
    """Represents a named entity"""
    def __init__(self, text: str, label: str, start: int, end: int, confidence: float = 1.0):
        self.text = text
        self.label = label
        self.start = start
        self.end = end
        self.confidence = confidence
        self.normalized_form = None
        self.aliases = []
        self.properties = {}


class EntityRelation:
    """Represents a relationship between entities"""
    def __init__(self, entity1: Entity, entity2: Entity, relation_type: str, confidence: float, context: str = ""):
        self.entity1 = entity1
        self.entity2 = entity2
        self.relation_type = relation_type
        self.confidence = confidence
        self.context = context


class EntityExtractor:
    """Service for extracting named entities and their relationships"""
    
    def __init__(self):
        self.nlp = None
        self.ner_pipeline = None
        self.relation_extractor = None
        self.entity_linker = None
        
        # Entity type mappings
        self.entity_type_mapping = {
            'PERSON': ['person', 'researcher', 'author', 'scientist'],
            'ORG': ['organization', 'institution', 'company', 'university'],
            'GPE': ['location', 'country', 'city', 'place'],
            'DATE': ['date', 'time', 'year', 'period'],
            'MONEY': ['amount', 'cost', 'price', 'budget'],
            'PERCENT': ['percentage', 'rate', 'ratio'],
            'QUANTITY': ['measurement', 'number', 'count'],
            'WORK_OF_ART': ['publication', 'paper', 'study', 'report'],
            'EVENT': ['event', 'conference', 'meeting', 'experiment'],
            'LAW': ['law', 'regulation', 'policy', 'act'],
            'LANGUAGE': ['language', 'dialect'],
            'PRODUCT': ['product', 'tool', 'technology', 'method']
        }
        
        # Initialize models
        asyncio.create_task(self._load_models())
    
    async def _load_models(self):
        """Load all required models for entity extraction"""
        try:
            logger.info("Loading entity extraction models...")
            
            # Load spaCy with NER capabilities
            self.nlp = spacy.load("en_core_web_sm")
            
            # Load transformer-based NER pipeline
            self.ner_pipeline = pipeline(
                "ner",
                model="dbmdz/bert-large-cased-finetuned-conll03-english",
                aggregation_strategy="simple",
                return_all_scores=True
            )
            
            # Load relation extraction pipeline
            self.relation_extractor = pipeline(
                "text-classification",
                model="facebook/bart-large-mnli",
                return_all_scores=True
            )
            
            logger.info("Entity extraction models loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load entity extraction models: {e}")
            raise
    
    async def extract_entities(
        self,
        text: str,
        confidence_threshold: float = 0.8,
        include_relationships: bool = True,
        entity_types: Optional[List[str]] = None
    ) -> Dict:
        """Extract named entities from text"""
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Extract entities using both spaCy and transformer models
            spacy_entities = await self._extract_spacy_entities(text)
            transformer_entities = await self._extract_transformer_entities(text)
            
            # Merge and deduplicate entities
            merged_entities = await self._merge_entities(spacy_entities, transformer_entities)
            
            # Filter by confidence and entity types
            filtered_entities = []
            for entity in merged_entities:
                if entity.confidence >= confidence_threshold:
                    if entity_types is None or entity.label in entity_types:
                        filtered_entities.append(entity)
            
            # Normalize entities (coreference resolution, aliases)
            normalized_entities = await self._normalize_entities(filtered_entities, text)
            
            # Extract relationships between entities if requested
            relationships = []
            if include_relationships and len(normalized_entities) > 1:
                relationships = await self._extract_entity_relationships(normalized_entities, text)
            
            # Build entity knowledge graph
            knowledge_graph = await self._build_entity_graph(normalized_entities, relationships)
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            return {
                "entities": [
                    {
                        "id": f"entity_{i}",
                        "text": entity.text,
                        "label": entity.label,
                        "start": entity.start,
                        "end": entity.end,
                        "confidence": entity.confidence,
                        "normalized_form": entity.normalized_form,
                        "aliases": entity.aliases,
                        "properties": entity.properties
                    }
                    for i, entity in enumerate(normalized_entities)
                ],
                "relationships": [
                    {
                        "id": f"rel_{i}",
                        "entity1": rel.entity1.text,
                        "entity2": rel.entity2.text,
                        "type": rel.relation_type,
                        "confidence": rel.confidence,
                        "context": rel.context
                    }
                    for i, rel in enumerate(relationships)
                ],
                "knowledge_graph": knowledge_graph,
                "processing_time": processing_time,
                "metadata": {
                    "entity_count": len(normalized_entities),
                    "relationship_count": len(relationships),
                    "entity_types": list(set(entity.label for entity in normalized_entities))
                }
            }
            
        except Exception as e:
            logger.error(f"Entity extraction failed: {e}")
            raise
    
    async def _extract_spacy_entities(self, text: str) -> List[Entity]:
        """Extract entities using spaCy"""
        try:
            doc = self.nlp(text)
            entities = []
            
            for ent in doc.ents:
                entity = Entity(
                    text=ent.text,
                    label=ent.label_,
                    start=ent.start_char,
                    end=ent.end_char,
                    confidence=1.0  # spaCy doesn't provide confidence scores
                )
                entities.append(entity)
            
            return entities
            
        except Exception as e:
            logger.error(f"spaCy entity extraction failed: {e}")
            return []
    
    async def _extract_transformer_entities(self, text: str) -> List[Entity]:
        """Extract entities using transformer model"""
        try:
            results = self.ner_pipeline(text)
            entities = []
            
            for result in results:
                entity = Entity(
                    text=result['word'],
                    label=result['entity_group'],
                    start=result['start'],
                    end=result['end'],
                    confidence=result['score']
                )
                entities.append(entity)
            
            return entities
            
        except Exception as e:
            logger.error(f"Transformer entity extraction failed: {e}")
            return []
    
    async def _merge_entities(self, spacy_entities: List[Entity], transformer_entities: List[Entity]) -> List[Entity]:
        """Merge entities from different extractors and remove duplicates"""
        try:
            merged = []
            
            # Add spaCy entities
            for entity in spacy_entities:
                merged.append(entity)
            
            # Add transformer entities that don't overlap with spaCy entities
            for t_entity in transformer_entities:
                overlap = False
                for s_entity in spacy_entities:
                    if self._entities_overlap(t_entity, s_entity):
                        # If transformer has higher confidence, replace spaCy entity
                        if t_entity.confidence > 0.9:  # High confidence threshold
                            merged = [e for e in merged if not self._entities_overlap(e, s_entity)]
                            merged.append(t_entity)
                        overlap = True
                        break
                
                if not overlap:
                    merged.append(t_entity)
            
            return merged
            
        except Exception as e:
            logger.error(f"Entity merging failed: {e}")
            return spacy_entities + transformer_entities
    
    def _entities_overlap(self, entity1: Entity, entity2: Entity) -> bool:
        """Check if two entities overlap in text position"""
        return not (entity1.end <= entity2.start or entity2.end <= entity1.start)
    
    async def _normalize_entities(self, entities: List[Entity], text: str) -> List[Entity]:
        """Normalize entities by resolving coreferences and finding aliases"""
        try:
            # Simple normalization - in production, use coreference resolution
            normalized = []
            
            for entity in entities:
                # Basic normalization
                entity.normalized_form = entity.text.strip()
                
                # Find potential aliases in text
                entity.aliases = await self._find_entity_aliases(entity, text)
                
                # Add entity properties based on type
                entity.properties = await self._extract_entity_properties(entity, text)
                
                normalized.append(entity)
            
            return normalized
            
        except Exception as e:
            logger.error(f"Entity normalization failed: {e}")
            return entities
    
    async def _find_entity_aliases(self, entity: Entity, text: str) -> List[str]:
        """Find aliases for an entity in the text"""
        try:
            aliases = []
            
            # Simple pattern matching for common aliases
            if entity.label == 'PERSON':
                # Look for initials, last names, etc.
                name_parts = entity.text.split()
                if len(name_parts) > 1:
                    # Add last name as alias
                    aliases.append(name_parts[-1])
                    # Add initials
                    initials = ''.join([part[0] for part in name_parts if part])
                    aliases.append(initials)
            
            elif entity.label == 'ORG':
                # Look for acronyms
                acronym_pattern = r'\b([A-Z]{2,})\b'
                acronyms = re.findall(acronym_pattern, text)
                for acronym in acronyms:
                    if len(acronym) <= len(entity.text.split()):
                        aliases.append(acronym)
            
            return list(set(aliases))
            
        except Exception as e:
            logger.error(f"Alias finding failed: {e}")
            return []
    
    async def _extract_entity_properties(self, entity: Entity, text: str) -> Dict:
        """Extract properties for an entity based on context"""
        try:
            properties = {}
            
            # Extract context around entity
            start = max(0, entity.start - 100)
            end = min(len(text), entity.end + 100)
            context = text[start:end]
            
            # Entity-type specific property extraction
            if entity.label == 'PERSON':
                # Look for titles, affiliations
                title_patterns = r'(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.|PhD|Professor|Doctor)'
                titles = re.findall(title_patterns, context, re.IGNORECASE)
                if titles:
                    properties['titles'] = list(set(titles))
                
                # Look for affiliations
                affiliation_patterns = r'(University|College|Institute|Department|Lab)'
                affiliations = re.findall(affiliation_patterns, context, re.IGNORECASE)
                if affiliations:
                    properties['affiliations'] = list(set(affiliations))
            
            elif entity.label == 'ORG':
                # Look for organization type
                org_types = r'(University|Company|Corporation|Institute|Foundation|Agency)'
                types = re.findall(org_types, context, re.IGNORECASE)
                if types:
                    properties['type'] = types[0].lower()
            
            elif entity.label == 'DATE':
                # Parse date format
                if re.match(r'\d{4}', entity.text):
                    properties['type'] = 'year'
                elif re.match(r'\d{1,2}/\d{1,2}/\d{4}', entity.text):
                    properties['type'] = 'date'
                elif re.match(r'(January|February|March|April|May|June|July|August|September|October|November|December)', entity.text, re.IGNORECASE):
                    properties['type'] = 'month'
            
            return properties
            
        except Exception as e:
            logger.error(f"Entity property extraction failed: {e}")
            return {}
    
    async def _extract_entity_relationships(self, entities: List[Entity], text: str) -> List[EntityRelation]:
        """Extract relationships between entities"""
        relationships = []
        
        try:
            for i, entity1 in enumerate(entities):
                for j, entity2 in enumerate(entities):
                    if i != j:
                        relation = await self._classify_entity_relationship(entity1, entity2, text)
                        if relation:
                            relationships.append(relation)
            
            return relationships
            
        except Exception as e:
            logger.error(f"Entity relationship extraction failed: {e}")
            return []
    
    async def _classify_entity_relationship(self, entity1: Entity, entity2: Entity, text: str) -> Optional[EntityRelation]:
        """Classify the relationship between two entities"""
        try:
            # Extract context between entities
            start = min(entity1.start, entity2.start)
            end = max(entity1.end, entity2.end)
            context = text[max(0, start-50):min(len(text), end+50)]
            
            # Pattern-based relationship detection
            relation_type = None
            confidence = 0.0
            
            # Common relationship patterns
            patterns = {
                'works_at': [r'{} (works at|employed by|affiliated with) {}', r'{} at {}'],
                'collaborates_with': [r'{} (collaborates with|works with|co-authored with) {}'],
                'located_in': [r'{} (in|at|located in) {}'],
                'founded_by': [r'{} (founded by|established by|created by) {}'],
                'studies': [r'{} (studies|researches|investigates) {}'],
                'publishes': [r'{} (published|wrote|authored) {}'],
                'cites': [r'{} (cites|references|mentions) {}'],
                'part_of': [r'{} (part of|division of|branch of) {}']
            }
            
            entity1_text = re.escape(entity1.text)
            entity2_text = re.escape(entity2.text)
            
            for rel_type, pattern_list in patterns.items():
                for pattern in pattern_list:
                    # Try both entity orders
                    pattern1 = pattern.format(entity1_text, entity2_text)
                    pattern2 = pattern.format(entity2_text, entity1_text)
                    
                    if re.search(pattern1, context, re.IGNORECASE):
                        relation_type = rel_type
                        confidence = 0.8
                        break
                    elif re.search(pattern2, context, re.IGNORECASE):
                        relation_type = f"inverse_{rel_type}"
                        confidence = 0.8
                        break
                
                if relation_type:
                    break
            
            # Use entity types to infer likely relationships
            if not relation_type:
                relation_type, confidence = await self._infer_relationship_from_types(
                    entity1, entity2, context
                )
            
            if relation_type and confidence > 0.5:
                return EntityRelation(
                    entity1=entity1,
                    entity2=entity2,
                    relation_type=relation_type,
                    confidence=confidence,
                    context=context
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Entity relationship classification failed: {e}")
            return None
    
    async def _infer_relationship_from_types(self, entity1: Entity, entity2: Entity, context: str) -> Tuple[str, float]:
        """Infer relationship based on entity types and context"""
        try:
            type_combinations = {
                ('PERSON', 'ORG'): 'affiliated_with',
                ('PERSON', 'PERSON'): 'collaborates_with',
                ('ORG', 'GPE'): 'located_in',
                ('PERSON', 'WORK_OF_ART'): 'authored',
                ('ORG', 'WORK_OF_ART'): 'published',
                ('PERSON', 'EVENT'): 'participated_in',
                ('ORG', 'EVENT'): 'organized',
                ('WORK_OF_ART', 'DATE'): 'published_on',
                ('EVENT', 'DATE'): 'occurred_on',
                ('EVENT', 'GPE'): 'held_at'
            }
            
            key = (entity1.label, entity2.label)
            if key in type_combinations:
                return type_combinations[key], 0.6
            
            # Try reverse order
            reverse_key = (entity2.label, entity1.label)
            if reverse_key in type_combinations:
                return f"inverse_{type_combinations[reverse_key]}", 0.6
            
            return "related_to", 0.3
            
        except Exception as e:
            logger.error(f"Relationship type inference failed: {e}")
            return "related_to", 0.1
    
    async def _build_entity_graph(self, entities: List[Entity], relationships: List[EntityRelation]) -> Dict:
        """Build knowledge graph from entities and relationships"""
        try:
            G = nx.Graph()
            
            # Add entity nodes
            for i, entity in enumerate(entities):
                G.add_node(f"entity_{i}", 
                          text=entity.text,
                          label=entity.label,
                          confidence=entity.confidence)
            
            # Add relationship edges
            entity_to_id = {entity.text: f"entity_{i}" for i, entity in enumerate(entities)}
            
            for relationship in relationships:
                entity1_id = entity_to_id.get(relationship.entity1.text)
                entity2_id = entity_to_id.get(relationship.entity2.text)
                
                if entity1_id and entity2_id:
                    G.add_edge(entity1_id, entity2_id,
                             type=relationship.relation_type,
                             confidence=relationship.confidence)
            
            # Calculate graph metrics
            graph_analysis = {
                "node_count": G.number_of_nodes(),
                "edge_count": G.number_of_edges(),
                "density": nx.density(G) if G.number_of_nodes() > 1 else 0,
                "connected_components": nx.number_connected_components(G),
                "entity_types": {}
            }
            
            # Count entity types
            entity_type_counts = Counter(entity.label for entity in entities)
            graph_analysis["entity_types"] = dict(entity_type_counts)
            
            # Calculate centrality if graph has edges
            if G.number_of_edges() > 0:
                centrality = nx.degree_centrality(G)
                graph_analysis["most_central_entities"] = sorted(
                    [(node, score) for node, score in centrality.items()],
                    key=lambda x: x[1],
                    reverse=True
                )[:5]
            
            return graph_analysis
            
        except Exception as e:
            logger.error(f"Entity graph building failed: {e}")
            return {}
    
    async def extract_domain_entities(self, text: str, domain: str = "academic") -> Dict:
        """Extract domain-specific entities"""
        try:
            # Domain-specific entity patterns
            domain_patterns = {
                "academic": {
                    "methodology": r'(experiment|study|analysis|survey|interview|observation|case study)',
                    "metric": r'(correlation|significance|p-value|confidence interval|effect size)',
                    "theory": r'(theory|hypothesis|model|framework|paradigm)',
                    "dataset": r'(dataset|corpus|sample|population|participants)',
                    "software": r'(Python|R|SPSS|MATLAB|software|tool|algorithm)'
                },
                "medical": {
                    "condition": r'(disease|disorder|syndrome|condition|illness)',
                    "treatment": r'(treatment|therapy|medication|drug|intervention)',
                    "symptom": r'(symptom|sign|manifestation|presentation)',
                    "test": r'(test|examination|screening|diagnostic|biomarker)'
                },
                "legal": {
                    "statute": r'(act|law|statute|regulation|code|ordinance)',
                    "case": r'(case|ruling|decision|judgment|precedent)',
                    "court": r'(court|tribunal|judge|justice|magistrate)',
                    "procedure": r'(procedure|process|hearing|trial|litigation)'
                }
            }
            
            domain_entities = []
            
            if domain in domain_patterns:
                doc = self.nlp(text)
                
                for entity_type, pattern in domain_patterns[domain].items():
                    matches = re.finditer(pattern, text, re.IGNORECASE)
                    
                    for match in matches:
                        entity = Entity(
                            text=match.group(),
                            label=f"{domain.upper()}_{entity_type.upper()}",
                            start=match.start(),
                            end=match.end(),
                            confidence=0.7
                        )
                        domain_entities.append(entity)
            
            return {
                "domain": domain,
                "entities": [
                    {
                        "text": entity.text,
                        "label": entity.label,
                        "start": entity.start,
                        "end": entity.end,
                        "confidence": entity.confidence
                    }
                    for entity in domain_entities
                ]
            }
            
        except Exception as e:
            logger.error(f"Domain entity extraction failed: {e}")
            return {"domain": domain, "entities": []}