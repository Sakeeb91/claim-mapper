"""
Semantic analysis service for claim relationships and similarity detection
"""

import asyncio
from typing import List, Dict, Optional, Tuple, Set
import numpy as np
from sentence_transformers import SentenceTransformer
import spacy
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import DBSCAN, AgglomerativeClustering
from sklearn.decomposition import PCA
import networkx as nx
from loguru import logger

from models.schemas import ExtractedClaim


class SemanticCluster:
    """Represents a semantic cluster of related claims"""
    def __init__(self, cluster_id: int, claims: List[str], centroid: np.ndarray, coherence: float):
        self.cluster_id = cluster_id
        self.claims = claims
        self.centroid = centroid
        self.coherence = coherence
        self.representative_claim = None
        self.keywords = []


class SemanticRelation:
    """Represents a semantic relation between claims"""
    def __init__(self, claim1: str, claim2: str, relation_type: str, strength: float, evidence: List[str] = None):
        self.claim1 = claim1
        self.claim2 = claim2
        self.relation_type = relation_type  # 'similar', 'opposite', 'entails', 'contradicts'
        self.strength = strength
        self.evidence = evidence or []


class SemanticAnalyzer:
    """Service for semantic analysis of claims and their relationships"""
    
    def __init__(self):
        self.embedding_model = None
        self.nlp = None
        self.claim_cache = {}  # Cache for claim embeddings
        
        # Initialize models
        asyncio.create_task(self._load_models())
    
    async def _load_models(self):
        """Load all required models for semantic analysis"""
        try:
            logger.info("Loading semantic analysis models...")
            
            # Load sentence transformer for embeddings
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Load spaCy for linguistic analysis
            self.nlp = spacy.load("en_core_web_sm")
            
            logger.info("Semantic analysis models loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load semantic analysis models: {e}")
            raise
    
    async def analyze_claim_relationships(
        self,
        claims: List[ExtractedClaim],
        similarity_threshold: float = 0.7,
        include_clustering: bool = True,
        include_contradictions: bool = True
    ) -> Dict:
        """Analyze semantic relationships between claims"""
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            claim_texts = [claim.text for claim in claims]
            
            # Generate embeddings for all claims
            embeddings = await self._get_embeddings(claim_texts)
            
            # Compute similarity matrix
            similarity_matrix = cosine_similarity(embeddings)
            
            # Find semantic relations
            relations = await self._extract_semantic_relations(
                claims, embeddings, similarity_matrix, similarity_threshold
            )
            
            # Detect contradictions if requested
            contradictions = []
            if include_contradictions:
                contradictions = await self._detect_contradictions(claims, embeddings)
            
            # Perform clustering if requested
            clusters = []
            if include_clustering and len(claims) > 2:
                clusters = await self._cluster_claims(claims, embeddings)
            
            # Analyze semantic network
            network_analysis = await self._analyze_semantic_network(claims, relations)
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            return {
                "relations": [
                    {
                        "claim1": rel.claim1,
                        "claim2": rel.claim2,
                        "type": rel.relation_type,
                        "strength": rel.strength,
                        "evidence": rel.evidence
                    }
                    for rel in relations
                ],
                "contradictions": contradictions,
                "clusters": [
                    {
                        "id": cluster.cluster_id,
                        "claims": cluster.claims,
                        "coherence": cluster.coherence,
                        "representative": cluster.representative_claim,
                        "keywords": cluster.keywords
                    }
                    for cluster in clusters
                ],
                "network_analysis": network_analysis,
                "processing_time": processing_time,
                "metadata": {
                    "claim_count": len(claims),
                    "relation_count": len(relations),
                    "contradiction_count": len(contradictions),
                    "cluster_count": len(clusters)
                }
            }
            
        except Exception as e:
            logger.error(f"Semantic relationship analysis failed: {e}")
            raise
    
    async def _get_embeddings(self, texts: List[str]) -> np.ndarray:
        """Get sentence embeddings with caching"""
        try:
            embeddings = []
            
            for text in texts:
                if text in self.claim_cache:
                    embeddings.append(self.claim_cache[text])
                else:
                    embedding = self.embedding_model.encode([text])[0]
                    self.claim_cache[text] = embedding
                    embeddings.append(embedding)
            
            return np.array(embeddings)
            
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            return np.array([])
    
    async def _extract_semantic_relations(
        self,
        claims: List[ExtractedClaim],
        embeddings: np.ndarray,
        similarity_matrix: np.ndarray,
        threshold: float
    ) -> List[SemanticRelation]:
        """Extract semantic relations between claims"""
        relations = []
        
        try:
            for i in range(len(claims)):
                for j in range(i + 1, len(claims)):
                    similarity = similarity_matrix[i][j]
                    
                    if similarity >= threshold:
                        # Determine relation type based on similarity and linguistic analysis
                        relation_type = await self._classify_relation_type(
                            claims[i].text, claims[j].text, similarity
                        )
                        
                        relation = SemanticRelation(
                            claim1=claims[i].text,
                            claim2=claims[j].text,
                            relation_type=relation_type,
                            strength=float(similarity)
                        )
                        relations.append(relation)
            
            return relations
            
        except Exception as e:
            logger.error(f"Semantic relation extraction failed: {e}")
            return []
    
    async def _classify_relation_type(self, claim1: str, claim2: str, similarity: float) -> str:
        """Classify the type of semantic relation between two claims"""
        try:
            # Analyze linguistic features
            doc1 = self.nlp(claim1)
            doc2 = self.nlp(claim2)
            
            # Check for negation patterns
            negation_words = {'not', 'no', 'never', 'none', 'nothing', 'neither', 'nor'}
            claim1_negated = any(token.text.lower() in negation_words for token in doc1)
            claim2_negated = any(token.text.lower() in negation_words for token in doc2)
            
            # Check for opposite sentiment or contradictory terms
            if claim1_negated != claim2_negated and similarity > 0.6:
                return "contradicts"
            
            # Check for entailment patterns
            if similarity > 0.85:
                # Very high similarity might indicate entailment or paraphrase
                if len(claim1.split()) < len(claim2.split()) * 0.8:
                    return "entails"
                elif len(claim2.split()) < len(claim1.split()) * 0.8:
                    return "entailed_by"
            
            # Check for similarity with different specificity
            if 0.7 <= similarity < 0.85:
                return "similar"
            
            return "related"
            
        except Exception as e:
            logger.error(f"Relation type classification failed: {e}")
            return "similar"
    
    async def _detect_contradictions(
        self,
        claims: List[ExtractedClaim],
        embeddings: np.ndarray
    ) -> List[Dict]:
        """Detect contradictory claims"""
        contradictions = []
        
        try:
            for i in range(len(claims)):
                for j in range(i + 1, len(claims)):
                    # Check semantic contradiction
                    is_contradiction = await self._is_contradiction(claims[i].text, claims[j].text)
                    
                    if is_contradiction:
                        # Calculate contradiction strength
                        similarity = cosine_similarity([embeddings[i]], [embeddings[j]])[0][0]
                        contradiction_strength = max(0.1, 1.0 - similarity)
                        
                        contradictions.append({
                            "claim1": claims[i].text,
                            "claim2": claims[j].text,
                            "strength": float(contradiction_strength),
                            "type": "semantic",
                            "evidence": await self._find_contradiction_evidence(claims[i].text, claims[j].text)
                        })
            
            return contradictions
            
        except Exception as e:
            logger.error(f"Contradiction detection failed: {e}")
            return []
    
    async def _is_contradiction(self, claim1: str, claim2: str) -> bool:
        """Check if two claims contradict each other"""
        try:
            # Analyze linguistic patterns
            doc1 = self.nlp(claim1)
            doc2 = self.nlp(claim2)
            
            # Extract key entities and concepts
            entities1 = {ent.text.lower() for ent in doc1.ents}
            entities2 = {ent.text.lower() for ent in doc2.ents}
            
            # Check for shared entities (necessary for contradiction)
            shared_entities = entities1.intersection(entities2)
            if not shared_entities:
                return False
            
            # Check for negation patterns
            negation_patterns = [
                (r'\bnot\b', r'\bis\b'),
                (r'\bno\b', r'\byes\b'),
                (r'\bfalse\b', r'\btrue\b'),
                (r'\bimpossible\b', r'\bpossible\b'),
                (r'\bnever\b', r'\balways\b'),
                (r'\bnone\b', r'\ball\b'),
            ]
            
            claim1_lower = claim1.lower()
            claim2_lower = claim2.lower()
            
            for neg_pattern, pos_pattern in negation_patterns:
                if (neg_pattern in claim1_lower and pos_pattern in claim2_lower) or \
                   (pos_pattern in claim1_lower and neg_pattern in claim2_lower):
                    return True
            
            # Check for contradictory adjectives/adverbs
            contradictory_pairs = [
                ('good', 'bad'), ('positive', 'negative'), ('high', 'low'),
                ('increase', 'decrease'), ('rise', 'fall'), ('more', 'less'),
                ('effective', 'ineffective'), ('successful', 'unsuccessful')
            ]
            
            for word1, word2 in contradictory_pairs:
                if (word1 in claim1_lower and word2 in claim2_lower) or \
                   (word2 in claim1_lower and word1 in claim2_lower):
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Contradiction check failed: {e}")
            return False
    
    async def _find_contradiction_evidence(self, claim1: str, claim2: str) -> List[str]:
        """Find evidence for why two claims contradict"""
        evidence = []
        
        try:
            doc1 = self.nlp(claim1)
            doc2 = self.nlp(claim2)
            
            # Find conflicting entities
            entities1 = {ent.text for ent in doc1.ents}
            entities2 = {ent.text for ent in doc2.ents}
            shared_entities = entities1.intersection(entities2)
            
            if shared_entities:
                evidence.append(f"Both claims discuss: {', '.join(shared_entities)}")
            
            # Find negation evidence
            if any(token.text.lower() in {'not', 'no', 'never'} for token in doc1):
                evidence.append("First claim contains negation")
            
            if any(token.text.lower() in {'not', 'no', 'never'} for token in doc2):
                evidence.append("Second claim contains negation")
            
            return evidence
            
        except Exception as e:
            logger.error(f"Contradiction evidence finding failed: {e}")
            return []
    
    async def _cluster_claims(
        self,
        claims: List[ExtractedClaim],
        embeddings: np.ndarray,
        method: str = "dbscan"
    ) -> List[SemanticCluster]:
        """Cluster semantically similar claims"""
        clusters = []
        
        try:
            if method == "dbscan":
                clustering = DBSCAN(eps=0.3, min_samples=2, metric='cosine')
            else:
                clustering = AgglomerativeClustering(
                    n_clusters=min(5, len(claims) // 2),
                    linkage='ward'
                )
            
            cluster_labels = clustering.fit_predict(embeddings)
            
            # Group claims by cluster
            cluster_groups = {}
            for i, label in enumerate(cluster_labels):
                if label not in cluster_groups:
                    cluster_groups[label] = []
                cluster_groups[label].append(i)
            
            # Create cluster objects
            for cluster_id, claim_indices in cluster_groups.items():
                if cluster_id == -1:  # DBSCAN noise
                    continue
                
                cluster_claims = [claims[i].text for i in claim_indices]
                cluster_embeddings = embeddings[claim_indices]
                
                # Calculate cluster centroid and coherence
                centroid = np.mean(cluster_embeddings, axis=0)
                coherence = await self._calculate_cluster_coherence(cluster_embeddings)
                
                cluster = SemanticCluster(
                    cluster_id=int(cluster_id),
                    claims=cluster_claims,
                    centroid=centroid,
                    coherence=coherence
                )
                
                # Find representative claim (closest to centroid)
                distances = [np.linalg.norm(emb - centroid) for emb in cluster_embeddings]
                representative_idx = np.argmin(distances)
                cluster.representative_claim = cluster_claims[representative_idx]
                
                # Extract cluster keywords
                cluster.keywords = await self._extract_cluster_keywords(cluster_claims)
                
                clusters.append(cluster)
            
            return clusters
            
        except Exception as e:
            logger.error(f"Claim clustering failed: {e}")
            return []
    
    async def _calculate_cluster_coherence(self, embeddings: np.ndarray) -> float:
        """Calculate coherence score for a cluster"""
        try:
            if len(embeddings) < 2:
                return 1.0
            
            # Calculate pairwise similarities
            similarity_matrix = cosine_similarity(embeddings)
            
            # Remove diagonal (self-similarity)
            np.fill_diagonal(similarity_matrix, 0)
            
            # Return mean similarity as coherence
            return float(np.mean(similarity_matrix))
            
        except Exception as e:
            logger.error(f"Cluster coherence calculation failed: {e}")
            return 0.0
    
    async def _extract_cluster_keywords(self, claims: List[str]) -> List[str]:
        """Extract representative keywords for a cluster"""
        try:
            # Combine all claims in cluster
            combined_text = " ".join(claims)
            doc = self.nlp(combined_text)
            
            # Extract important tokens
            keywords = []
            for token in doc:
                if (token.pos_ in ['NOUN', 'PROPN', 'ADJ'] and 
                    not token.is_stop and 
                    not token.is_punct and 
                    len(token.text) > 2):
                    keywords.append(token.lemma_.lower())
            
            # Count frequency and return top keywords
            from collections import Counter
            keyword_counts = Counter(keywords)
            return [word for word, count in keyword_counts.most_common(10)]
            
        except Exception as e:
            logger.error(f"Cluster keyword extraction failed: {e}")
            return []
    
    async def _analyze_semantic_network(
        self,
        claims: List[ExtractedClaim],
        relations: List[SemanticRelation]
    ) -> Dict:
        """Analyze the semantic network structure"""
        try:
            # Create network graph
            G = nx.Graph()
            
            # Add nodes (claims)
            for i, claim in enumerate(claims):
                G.add_node(i, text=claim.text, type=claim.type.value)
            
            # Add edges (relations)
            for relation in relations:
                # Find node indices
                claim1_idx = next((i for i, c in enumerate(claims) if c.text == relation.claim1), None)
                claim2_idx = next((i for i, c in enumerate(claims) if c.text == relation.claim2), None)
                
                if claim1_idx is not None and claim2_idx is not None:
                    G.add_edge(claim1_idx, claim2_idx, 
                             type=relation.relation_type, 
                             weight=relation.strength)
            
            # Calculate network metrics
            analysis = {
                "node_count": G.number_of_nodes(),
                "edge_count": G.number_of_edges(),
                "density": nx.density(G) if G.number_of_nodes() > 1 else 0,
                "average_clustering": nx.average_clustering(G) if G.number_of_nodes() > 2 else 0,
                "connected_components": nx.number_connected_components(G),
                "diameter": 0,
                "centrality_scores": {}
            }
            
            # Calculate diameter for connected graphs
            if nx.is_connected(G) and G.number_of_nodes() > 1:
                analysis["diameter"] = nx.diameter(G)
            
            # Calculate centrality measures
            if G.number_of_nodes() > 1:
                centrality = nx.degree_centrality(G)
                analysis["centrality_scores"] = {
                    str(node): score for node, score in centrality.items()
                }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Semantic network analysis failed: {e}")
            return {}
    
    async def find_similar_claims(
        self,
        query_claim: str,
        candidate_claims: List[str],
        top_k: int = 5,
        threshold: float = 0.5
    ) -> List[Dict]:
        """Find claims most similar to a query claim"""
        try:
            # Generate embeddings
            all_texts = [query_claim] + candidate_claims
            embeddings = await self._get_embeddings(all_texts)
            
            # Calculate similarities
            query_embedding = embeddings[0:1]
            candidate_embeddings = embeddings[1:]
            
            similarities = cosine_similarity(query_embedding, candidate_embeddings)[0]
            
            # Filter by threshold and sort
            results = []
            for i, similarity in enumerate(similarities):
                if similarity >= threshold:
                    results.append({
                        "claim": candidate_claims[i],
                        "similarity": float(similarity),
                        "rank": len(results) + 1
                    })
            
            # Sort by similarity and return top_k
            results.sort(key=lambda x: x['similarity'], reverse=True)
            
            # Update ranks
            for i, result in enumerate(results[:top_k]):
                result['rank'] = i + 1
            
            return results[:top_k]
            
        except Exception as e:
            logger.error(f"Similar claim finding failed: {e}")
            return []