"""
Pydantic schemas for ML service API
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Union
from enum import Enum


class ReasoningType(str, Enum):
    DEDUCTIVE = "deductive"
    INDUCTIVE = "inductive"
    ABDUCTIVE = "abductive"


class ClaimType(str, Enum):
    HYPOTHESIS = "hypothesis"
    ASSERTION = "assertion"
    QUESTION = "question"


class EvidenceType(str, Enum):
    SUPPORTING = "supporting"
    CONTRADICTING = "contradicting"
    NEUTRAL = "neutral"


class AnalysisType(str, Enum):
    CENTRALITY = "centrality"
    CLUSTERING = "clustering"
    PATHFINDING = "pathfinding"
    INFLUENCE = "influence"


# Request Models
class ClaimExtractionRequest(BaseModel):
    text: str = Field(..., description="Text to extract claims from")
    source: Optional[str] = Field(None, description="Source of the text")
    confidence_threshold: float = Field(0.7, description="Minimum confidence threshold")
    extract_evidence: bool = Field(True, description="Whether to extract supporting evidence")
    
    class Config:
        schema_extra = {
            "example": {
                "text": "Climate change is primarily caused by human activities. Studies show that greenhouse gas emissions have increased significantly since the industrial revolution.",
                "source": "Scientific Paper 2023",
                "confidence_threshold": 0.8,
                "extract_evidence": True
            }
        }


class ReasoningRequest(BaseModel):
    claim: str = Field(..., description="The claim to generate reasoning for")
    evidence: List[str] = Field(default_factory=list, description="Supporting evidence")
    reasoning_type: ReasoningType = Field(ReasoningType.DEDUCTIVE, description="Type of reasoning")
    max_steps: int = Field(5, description="Maximum reasoning steps to generate")
    
    class Config:
        schema_extra = {
            "example": {
                "claim": "Renewable energy is essential for sustainable development",
                "evidence": [
                    "Solar energy costs have decreased by 80% in the last decade",
                    "Wind power now accounts for 10% of global electricity generation"
                ],
                "reasoning_type": "inductive",
                "max_steps": 3
            }
        }


class GraphNode(BaseModel):
    id: str
    type: str
    label: str
    properties: Dict = Field(default_factory=dict)


class GraphLink(BaseModel):
    id: str
    source: str
    target: str
    type: str
    weight: float = Field(1.0)
    properties: Dict = Field(default_factory=dict)


class GraphAnalysisRequest(BaseModel):
    nodes: List[GraphNode]
    links: List[GraphLink]
    analysis_type: AnalysisType
    parameters: Dict = Field(default_factory=dict)
    
    class Config:
        schema_extra = {
            "example": {
                "nodes": [
                    {"id": "1", "type": "claim", "label": "Climate change is real"},
                    {"id": "2", "type": "evidence", "label": "Temperature data shows warming"}
                ],
                "links": [
                    {"id": "1", "source": "2", "target": "1", "type": "supports", "weight": 0.9}
                ],
                "analysis_type": "centrality",
                "parameters": {"algorithm": "pagerank"}
            }
        }


# Response Models
class ExtractedClaim(BaseModel):
    text: str
    type: ClaimType
    confidence: float
    position: Dict[str, int] = Field(description="Start and end positions in text")
    keywords: List[str] = Field(default_factory=list)
    related_evidence: List[str] = Field(default_factory=list)


class ClaimExtractionResponse(BaseModel):
    claims: List[ExtractedClaim]
    processing_time: float
    model_version: str
    metadata: Dict = Field(default_factory=dict)


class ReasoningStep(BaseModel):
    step_number: int
    text: str
    confidence: float
    type: str = Field(description="premise, inference, or conclusion")
    evidence_used: List[str] = Field(default_factory=list)


class ReasoningChain(BaseModel):
    steps: List[ReasoningStep]
    reasoning_type: ReasoningType
    overall_confidence: float
    logical_validity: float = Field(description="Logical validity score 0-1")


class ReasoningResponse(BaseModel):
    reasoning_chains: List[ReasoningChain]
    processing_time: float
    model_version: str
    metadata: Dict = Field(default_factory=dict)


class NodeAnalysis(BaseModel):
    node_id: str
    centrality_score: Optional[float] = None
    cluster_id: Optional[int] = None
    influence_score: Optional[float] = None
    properties: Dict = Field(default_factory=dict)


class ClusterInfo(BaseModel):
    cluster_id: int
    size: int
    coherence_score: float
    representative_nodes: List[str]
    description: Optional[str] = None


class PathInfo(BaseModel):
    source: str
    target: str
    path: List[str]
    path_length: int
    path_strength: float


class GraphAnalysisResponse(BaseModel):
    analysis_type: AnalysisType
    node_analyses: List[NodeAnalysis]
    clusters: Optional[List[ClusterInfo]] = None
    paths: Optional[List[PathInfo]] = None
    global_metrics: Dict = Field(default_factory=dict)
    processing_time: float
    metadata: Dict = Field(default_factory=dict)


# Utility Models
class SimilarityResult(BaseModel):
    text: str
    similarity: float
    rank: int


class BatchProcessingStatus(BaseModel):
    task_id: str
    status: str
    progress: float
    results_count: int
    error_message: Optional[str] = None


class ModelInfo(BaseModel):
    name: str
    version: str
    description: str
    capabilities: List[str]
    performance_metrics: Dict = Field(default_factory=dict)