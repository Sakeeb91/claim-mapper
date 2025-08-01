"""
Graph analysis service for knowledge graph structure and relationships
"""

import asyncio
from typing import List, Dict, Optional, Tuple, Set
import networkx as nx
import numpy as np
from sklearn.cluster import SpectralClustering, DBSCAN
from sklearn.metrics.pairwise import cosine_similarity
import community as community_louvain
from loguru import logger
import math

from models.schemas import GraphNode, GraphLink, AnalysisType, NodeAnalysis, ClusterInfo, PathInfo


class GraphAnalyzer:
    """Service for analyzing knowledge graph structure and relationships"""
    
    def __init__(self):
        self.graph_cache = {}
        self.analysis_cache = {}
        
        # Analysis algorithms
        self.centrality_algorithms = {
            'degree': nx.degree_centrality,
            'betweenness': nx.betweenness_centrality,
            'closeness': nx.closeness_centrality,
            'eigenvector': nx.eigenvector_centrality,
            'pagerank': nx.pagerank,
            'katz': nx.katz_centrality
        }
        
        self.clustering_algorithms = {
            'louvain': self._louvain_clustering,
            'spectral': self._spectral_clustering,
            'dbscan': self._dbscan_clustering
        }
    
    async def analyze_graph(
        self,
        nodes: List[GraphNode],
        links: List[GraphLink],
        analysis_type: AnalysisType,
        parameters: Dict = None
    ) -> Dict:
        """Analyze graph structure and relationships"""
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Build networkx graph
            G = await self._build_networkx_graph(nodes, links)
            
            # Perform requested analysis
            if analysis_type == AnalysisType.CENTRALITY:
                result = await self._analyze_centrality(G, nodes, parameters or {})
            elif analysis_type == AnalysisType.CLUSTERING:
                result = await self._analyze_clustering(G, nodes, parameters or {})
            elif analysis_type == AnalysisType.PATHFINDING:
                result = await self._analyze_paths(G, nodes, parameters or {})
            elif analysis_type == AnalysisType.INFLUENCE:
                result = await self._analyze_influence(G, nodes, parameters or {})
            else:
                result = await self._comprehensive_analysis(G, nodes)
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            # Add metadata
            result.update({
                "processing_time": processing_time,
                "metadata": {
                    "node_count": len(nodes),
                    "link_count": len(links),
                    "graph_density": nx.density(G) if G.number_of_nodes() > 1 else 0,
                    "connected_components": nx.number_connected_components(G),
                    "analysis_type": analysis_type.value
                }
            })
            
            return result
            
        except Exception as e:
            logger.error(f"Graph analysis failed: {e}")
            raise
    
    async def _build_networkx_graph(self, nodes: List[GraphNode], links: List[GraphLink]) -> nx.Graph:
        """Build NetworkX graph from nodes and links"""
        try:
            G = nx.Graph()
            
            # Add nodes
            for node in nodes:
                G.add_node(
                    node.id,
                    type=node.type,
                    label=node.label,
                    **node.properties
                )
            
            # Add edges
            for link in links:
                if G.has_node(link.source) and G.has_node(link.target):
                    G.add_edge(
                        link.source,
                        link.target,
                        weight=link.weight,
                        type=link.type,
                        **link.properties
                    )
            
            return G
            
        except Exception as e:
            logger.error(f"Graph building failed: {e}")
            return nx.Graph()
    
    async def _analyze_centrality(self, G: nx.Graph, nodes: List[GraphNode], parameters: Dict) -> Dict:
        """Analyze node centrality measures"""
        try:
            algorithm = parameters.get('algorithm', 'pagerank')
            
            if G.number_of_nodes() == 0:
                return {
                    "analysis_type": AnalysisType.CENTRALITY,
                    "node_analyses": [],
                    "global_metrics": {}
                }
            
            # Calculate centrality
            if algorithm in self.centrality_algorithms:
                centrality_func = self.centrality_algorithms[algorithm]
                
                # Handle algorithms that might fail
                try:
                    if algorithm == 'eigenvector':
                        centrality_scores = centrality_func(G, max_iter=1000)
                    elif algorithm == 'katz':
                        centrality_scores = centrality_func(G, max_iter=1000)
                    else:
                        centrality_scores = centrality_func(G)
                except:
                    # Fallback to degree centrality
                    centrality_scores = nx.degree_centrality(G)
                    algorithm = 'degree'
            else:
                centrality_scores = nx.pagerank(G)
                algorithm = 'pagerank'
            
            # Create node analyses
            node_analyses = []
            for node in nodes:
                if node.id in centrality_scores:
                    analysis = NodeAnalysis(
                        node_id=node.id,
                        centrality_score=centrality_scores[node.id],
                        properties={
                            "algorithm": algorithm,
                            "rank": 0,  # Will be set below
                            "node_type": node.type,
                            "node_label": node.label
                        }
                    )
                    node_analyses.append(analysis)
            
            # Sort by centrality and assign ranks
            node_analyses.sort(key=lambda x: x.centrality_score, reverse=True)
            for i, analysis in enumerate(node_analyses):
                analysis.properties["rank"] = i + 1
            
            # Global metrics
            centrality_values = list(centrality_scores.values())
            global_metrics = {
                "centralization": self._calculate_centralization(centrality_values),
                "max_centrality": max(centrality_values) if centrality_values else 0,
                "min_centrality": min(centrality_values) if centrality_values else 0,
                "mean_centrality": np.mean(centrality_values) if centrality_values else 0,
                "std_centrality": np.std(centrality_values) if centrality_values else 0
            }
            
            return {
                "analysis_type": AnalysisType.CENTRALITY,
                "node_analyses": node_analyses,
                "global_metrics": global_metrics
            }
            
        except Exception as e:
            logger.error(f"Centrality analysis failed: {e}")
            return {
                "analysis_type": AnalysisType.CENTRALITY,
                "node_analyses": [],
                "global_metrics": {}
            }
    
    async def _analyze_clustering(self, G: nx.Graph, nodes: List[GraphNode], parameters: Dict) -> Dict:
        """Analyze graph clustering structure"""
        try:
            algorithm = parameters.get('algorithm', 'louvain')
            
            if G.number_of_nodes() < 2:
                return {
                    "analysis_type": AnalysisType.CLUSTERING,
                    "node_analyses": [],
                    "clusters": [],
                    "global_metrics": {}
                }
            
            # Perform clustering
            if algorithm in self.clustering_algorithms:
                clusters, cluster_assignments = await self.clustering_algorithms[algorithm](G, parameters)
            else:
                clusters, cluster_assignments = await self._louvain_clustering(G, parameters)
            
            # Create node analyses with cluster assignments
            node_analyses = []
            for node in nodes:
                if node.id in cluster_assignments:
                    analysis = NodeAnalysis(
                        node_id=node.id,
                        cluster_id=cluster_assignments[node.id],
                        properties={
                            "algorithm": algorithm,
                            "node_type": node.type,
                            "node_label": node.label
                        }
                    )
                    node_analyses.append(analysis)
            
            # Calculate global clustering metrics
            global_metrics = {
                "modularity": self._calculate_modularity(G, cluster_assignments),
                "num_clusters": len(clusters),
                "avg_cluster_size": np.mean([cluster.size for cluster in clusters]) if clusters else 0,
                "clustering_coefficient": nx.average_clustering(G) if G.number_of_nodes() > 2 else 0
            }
            
            return {
                "analysis_type": AnalysisType.CLUSTERING,
                "node_analyses": node_analyses,
                "clusters": clusters,
                "global_metrics": global_metrics
            }
            
        except Exception as e:
            logger.error(f"Clustering analysis failed: {e}")
            return {
                "analysis_type": AnalysisType.CLUSTERING,
                "node_analyses": [],
                "clusters": [],
                "global_metrics": {}
            }
    
    async def _analyze_paths(self, G: nx.Graph, nodes: List[GraphNode], parameters: Dict) -> Dict:
        """Analyze paths and connectivity in the graph"""
        try:
            source_node = parameters.get('source')
            target_node = parameters.get('target')
            max_paths = parameters.get('max_paths', 10)
            
            paths = []
            
            if source_node and target_node:
                # Find paths between specific nodes
                if G.has_node(source_node) and G.has_node(target_node):
                    try:
                        all_paths = list(nx.all_simple_paths(G, source_node, target_node, cutoff=5))
                        for path in all_paths[:max_paths]:
                            path_info = PathInfo(
                                source=source_node,
                                target=target_node,
                                path=path,
                                path_length=len(path) - 1,
                                path_strength=self._calculate_path_strength(G, path)
                            )
                            paths.append(path_info)
                    except nx.NetworkXNoPath:
                        pass
            else:
                # Find important paths in the graph
                paths = await self._find_important_paths(G, max_paths)
            
            # Calculate path-related metrics
            global_metrics = {
                "average_shortest_path_length": 0,
                "diameter": 0,
                "radius": 0,
                "connectivity": nx.node_connectivity(G) if G.number_of_nodes() > 1 else 0
            }
            
            if nx.is_connected(G) and G.number_of_nodes() > 1:
                global_metrics["average_shortest_path_length"] = nx.average_shortest_path_length(G)
                global_metrics["diameter"] = nx.diameter(G)
                global_metrics["radius"] = nx.radius(G)
            
            return {
                "analysis_type": AnalysisType.PATHFINDING,
                "paths": paths,
                "global_metrics": global_metrics
            }
            
        except Exception as e:
            logger.error(f"Path analysis failed: {e}")
            return {
                "analysis_type": AnalysisType.PATHFINDING,
                "paths": [],
                "global_metrics": {}
            }
    
    async def _analyze_influence(self, G: nx.Graph, nodes: List[GraphNode], parameters: Dict) -> Dict:
        """Analyze influence propagation in the graph"""
        try:
            source_nodes = parameters.get('source_nodes', [])
            influence_model = parameters.get('model', 'linear_threshold')
            
            if not source_nodes:
                # Use top degree nodes as sources
                degree_centrality = nx.degree_centrality(G)
                source_nodes = sorted(degree_centrality.keys(), 
                                    key=degree_centrality.get, reverse=True)[:3]
            
            # Calculate influence scores
            influence_scores = await self._calculate_influence_scores(
                G, source_nodes, influence_model
            )
            
            # Create node analyses with influence scores
            node_analyses = []
            for node in nodes:
                if node.id in influence_scores:
                    analysis = NodeAnalysis(
                        node_id=node.id,
                        influence_score=influence_scores[node.id],
                        properties={
                            "model": influence_model,
                            "is_source": node.id in source_nodes,
                            "node_type": node.type,
                            "node_label": node.label
                        }
                    )
                    node_analyses.append(analysis)
            
            # Sort by influence score
            node_analyses.sort(key=lambda x: x.influence_score or 0, reverse=True)
            
            # Global influence metrics
            influence_values = [score for score in influence_scores.values() if score is not None]
            global_metrics = {
                "total_influence": sum(influence_values),
                "max_influence": max(influence_values) if influence_values else 0,
                "influence_spread": len([s for s in influence_values if s > 0.1]),
                "influence_concentration": np.std(influence_values) if influence_values else 0
            }
            
            return {
                "analysis_type": AnalysisType.INFLUENCE,
                "node_analyses": node_analyses,
                "global_metrics": global_metrics
            }
            
        except Exception as e:
            logger.error(f"Influence analysis failed: {e}")
            return {
                "analysis_type": AnalysisType.INFLUENCE,
                "node_analyses": [],
                "global_metrics": {}
            }
    
    async def _comprehensive_analysis(self, G: nx.Graph, nodes: List[GraphNode]) -> Dict:
        """Perform comprehensive graph analysis"""
        try:
            # Run all analysis types
            centrality_result = await self._analyze_centrality(G, nodes, {'algorithm': 'pagerank'})
            clustering_result = await self._analyze_clustering(G, nodes, {'algorithm': 'louvain'})
            path_result = await self._analyze_paths(G, nodes, {'max_paths': 5})
            influence_result = await self._analyze_influence(G, nodes, {'model': 'linear_threshold'})
            
            # Combine results
            return {
                "analysis_type": "comprehensive",
                "centrality": centrality_result,
                "clustering": clustering_result,
                "pathfinding": path_result,
                "influence": influence_result,
                "global_metrics": {
                    "node_count": G.number_of_nodes(),
                    "edge_count": G.number_of_edges(),
                    "density": nx.density(G) if G.number_of_nodes() > 1 else 0,
                    "transitivity": nx.transitivity(G),
                    "assortativity": nx.degree_assortativity_coefficient(G) if G.number_of_edges() > 0 else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Comprehensive analysis failed: {e}")
            return {
                "analysis_type": "comprehensive",
                "global_metrics": {}
            }
    
    async def _louvain_clustering(self, G: nx.Graph, parameters: Dict) -> Tuple[List[ClusterInfo], Dict[str, int]]:
        """Perform Louvain community detection"""
        try:
            partition = community_louvain.best_partition(G)
            
            # Group nodes by cluster
            clusters_dict = {}
            for node, cluster in partition.items():
                if cluster not in clusters_dict:
                    clusters_dict[cluster] = []
                clusters_dict[cluster].append(node)
            
            # Create cluster info objects
            clusters = []
            for cluster_id, cluster_nodes in clusters_dict.items():
                # Calculate cluster coherence
                subgraph = G.subgraph(cluster_nodes)
                coherence = self._calculate_cluster_coherence(subgraph)
                
                # Find representative nodes (highest degree within cluster)
                node_degrees = dict(subgraph.degree())
                representative_nodes = sorted(node_degrees.keys(), 
                                            key=node_degrees.get, reverse=True)[:3]
                
                cluster_info = ClusterInfo(
                    cluster_id=cluster_id,
                    size=len(cluster_nodes),
                    coherence_score=coherence,
                    representative_nodes=representative_nodes,
                    description=f"Cluster {cluster_id} with {len(cluster_nodes)} nodes"
                )
                clusters.append(cluster_info)
            
            return clusters, partition
            
        except Exception as e:
            logger.error(f"Louvain clustering failed: {e}")
            return [], {}
    
    async def _spectral_clustering(self, G: nx.Graph, parameters: Dict) -> Tuple[List[ClusterInfo], Dict[str, int]]:
        """Perform spectral clustering"""
        try:
            n_clusters = parameters.get('n_clusters', min(8, max(2, G.number_of_nodes() // 5)))
            
            # Get adjacency matrix
            adjacency_matrix = nx.adjacency_matrix(G)
            
            # Perform spectral clustering
            clustering = SpectralClustering(n_clusters=n_clusters, affinity='precomputed')
            cluster_labels = clustering.fit_predict(adjacency_matrix)
            
            # Map node IDs to cluster labels
            nodes = list(G.nodes())
            partition = {nodes[i]: cluster_labels[i] for i in range(len(nodes))}
            
            # Create cluster info (similar to Louvain)
            clusters_dict = {}
            for node, cluster in partition.items():
                if cluster not in clusters_dict:
                    clusters_dict[cluster] = []
                clusters_dict[cluster].append(node)
            
            clusters = []
            for cluster_id, cluster_nodes in clusters_dict.items():
                subgraph = G.subgraph(cluster_nodes)
                coherence = self._calculate_cluster_coherence(subgraph)
                
                node_degrees = dict(subgraph.degree())
                representative_nodes = sorted(node_degrees.keys(), 
                                            key=node_degrees.get, reverse=True)[:3]
                
                cluster_info = ClusterInfo(
                    cluster_id=int(cluster_id),
                    size=len(cluster_nodes),
                    coherence_score=coherence,
                    representative_nodes=representative_nodes,
                    description=f"Spectral cluster {cluster_id} with {len(cluster_nodes)} nodes"
                )
                clusters.append(cluster_info)
            
            return clusters, partition
            
        except Exception as e:
            logger.error(f"Spectral clustering failed: {e}")
            return [], {}
    
    async def _dbscan_clustering(self, G: nx.Graph, parameters: Dict) -> Tuple[List[ClusterInfo], Dict[str, int]]:
        """Perform DBSCAN clustering on graph"""
        try:
            eps = parameters.get('eps', 0.5)
            min_samples = parameters.get('min_samples', 3)
            
            # Calculate distance matrix based on shortest paths
            nodes = list(G.nodes())
            if len(nodes) < min_samples:
                return [], {}
            
            # Create distance matrix
            distance_matrix = np.zeros((len(nodes), len(nodes)))
            for i, node1 in enumerate(nodes):
                for j, node2 in enumerate(nodes):
                    if i != j:
                        try:
                            path_length = nx.shortest_path_length(G, node1, node2)
                            distance_matrix[i][j] = path_length
                        except nx.NetworkXNoPath:
                            distance_matrix[i][j] = float('inf')
            
            # Replace infinite distances with max finite distance + 1
            max_finite = np.max(distance_matrix[distance_matrix != float('inf')])
            distance_matrix[distance_matrix == float('inf')] = max_finite + 1
            
            # Perform DBSCAN
            clustering = DBSCAN(eps=eps, min_samples=min_samples, metric='precomputed')
            cluster_labels = clustering.fit_predict(distance_matrix)
            
            # Map node IDs to cluster labels
            partition = {nodes[i]: cluster_labels[i] for i in range(len(nodes))}
            
            # Create cluster info
            clusters_dict = {}
            for node, cluster in partition.items():
                if cluster != -1:  # Ignore noise points
                    if cluster not in clusters_dict:
                        clusters_dict[cluster] = []
                    clusters_dict[cluster].append(node)
            
            clusters = []
            for cluster_id, cluster_nodes in clusters_dict.items():
                subgraph = G.subgraph(cluster_nodes)
                coherence = self._calculate_cluster_coherence(subgraph)
                
                node_degrees = dict(subgraph.degree())
                representative_nodes = sorted(node_degrees.keys(), 
                                            key=node_degrees.get, reverse=True)[:3]
                
                cluster_info = ClusterInfo(
                    cluster_id=int(cluster_id),
                    size=len(cluster_nodes),
                    coherence_score=coherence,
                    representative_nodes=representative_nodes,
                    description=f"DBSCAN cluster {cluster_id} with {len(cluster_nodes)} nodes"
                )
                clusters.append(cluster_info)
            
            return clusters, partition
            
        except Exception as e:
            logger.error(f"DBSCAN clustering failed: {e}")
            return [], {}
    
    async def _find_important_paths(self, G: nx.Graph, max_paths: int) -> List[PathInfo]:
        """Find important paths in the graph"""
        try:
            paths = []
            
            # Get high centrality nodes as path endpoints
            centrality = nx.betweenness_centrality(G)
            important_nodes = sorted(centrality.keys(), key=centrality.get, reverse=True)[:10]
            
            # Find paths between important nodes
            for i, source in enumerate(important_nodes):
                for target in important_nodes[i+1:]:
                    if source != target:
                        try:
                            shortest_path = nx.shortest_path(G, source, target)
                            if len(shortest_path) > 1:  # Avoid self-loops
                                path_info = PathInfo(
                                    source=source,
                                    target=target,
                                    path=shortest_path,
                                    path_length=len(shortest_path) - 1,
                                    path_strength=self._calculate_path_strength(G, shortest_path)
                                )
                                paths.append(path_info)
                        except nx.NetworkXNoPath:
                            continue
                        
                        if len(paths) >= max_paths:
                            break
                
                if len(paths) >= max_paths:
                    break
            
            # Sort by path strength
            paths.sort(key=lambda x: x.path_strength, reverse=True)
            
            return paths[:max_paths]
            
        except Exception as e:
            logger.error(f"Important path finding failed: {e}")
            return []
    
    async def _calculate_influence_scores(self, G: nx.Graph, source_nodes: List[str], model: str) -> Dict[str, float]:
        """Calculate influence propagation scores"""
        try:
            influence_scores = {}
            
            if model == 'linear_threshold':
                # Simple linear threshold model
                threshold = 0.5
                influenced = set(source_nodes)
                
                # Initialize influence scores
                for node in G.nodes():
                    if node in source_nodes:
                        influence_scores[node] = 1.0
                    else:
                        influence_scores[node] = 0.0
                
                # Iterative influence propagation
                for iteration in range(5):  # Max 5 iterations
                    new_influenced = set()
                    
                    for node in G.nodes():
                        if node not in influenced:
                            # Calculate influence from neighbors
                            neighbor_influence = 0
                            neighbor_count = 0
                            
                            for neighbor in G.neighbors(node):
                                if neighbor in influenced:
                                    edge_weight = G[node][neighbor].get('weight', 1.0)
                                    neighbor_influence += edge_weight
                                    neighbor_count += 1
                            
                            if neighbor_count > 0:
                                avg_influence = neighbor_influence / neighbor_count
                                if avg_influence >= threshold:
                                    new_influenced.add(node)
                                    influence_scores[node] = avg_influence
                    
                    influenced.update(new_influenced)
                    
                    if not new_influenced:  # No new nodes influenced
                        break
            
            else:  # Default to PageRank-based influence
                pagerank_scores = nx.pagerank(G, personalization={node: 1.0 for node in source_nodes})
                influence_scores = pagerank_scores
            
            return influence_scores
            
        except Exception as e:
            logger.error(f"Influence calculation failed: {e}")
            return {}
    
    def _calculate_centralization(self, centrality_values: List[float]) -> float:
        """Calculate graph centralization measure"""
        try:
            if not centrality_values:
                return 0.0
            
            max_centrality = max(centrality_values)
            sum_differences = sum(max_centrality - c for c in centrality_values)
            n = len(centrality_values)
            
            # Theoretical maximum for a star graph
            max_possible = (n - 1) * (n - 2) / (n - 1) if n > 2 else 1
            
            return sum_differences / max_possible if max_possible > 0 else 0.0
            
        except Exception as e:
            logger.error(f"Centralization calculation failed: {e}")
            return 0.0
    
    def _calculate_modularity(self, G: nx.Graph, partition: Dict[str, int]) -> float:
        """Calculate modularity of a graph partition"""
        try:
            if not partition:
                return 0.0
            
            return community_louvain.modularity(partition, G)
            
        except Exception as e:
            logger.error(f"Modularity calculation failed: {e}")
            return 0.0
    
    def _calculate_cluster_coherence(self, subgraph: nx.Graph) -> float:
        """Calculate coherence score for a cluster"""
        try:
            if subgraph.number_of_nodes() <= 1:
                return 1.0
            
            # Internal density
            internal_edges = subgraph.number_of_edges()
            possible_edges = subgraph.number_of_nodes() * (subgraph.number_of_nodes() - 1) / 2
            
            density = internal_edges / possible_edges if possible_edges > 0 else 0
            
            # Average clustering coefficient
            clustering_coeff = nx.average_clustering(subgraph) if subgraph.number_of_nodes() > 2 else 0
            
            # Combine metrics
            coherence = (density + clustering_coeff) / 2
            
            return coherence
            
        except Exception as e:
            logger.error(f"Cluster coherence calculation failed: {e}")
            return 0.0
    
    def _calculate_path_strength(self, G: nx.Graph, path: List[str]) -> float:
        """Calculate the strength of a path based on edge weights"""
        try:
            if len(path) < 2:
                return 0.0
            
            total_weight = 0.0
            for i in range(len(path) - 1):
                edge_data = G.get_edge_data(path[i], path[i + 1])
                weight = edge_data.get('weight', 1.0) if edge_data else 1.0
                total_weight += weight
            
            # Average weight along the path
            return total_weight / (len(path) - 1)
            
        except Exception as e:
            logger.error(f"Path strength calculation failed: {e}")
            return 0.0