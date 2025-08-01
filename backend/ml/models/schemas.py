"""
Pydantic schemas for ML service API
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Union, Tuple
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
        json_schema_extra = {
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
        json_schema_extra = {
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


class AdvancedReasoningRequest(BaseModel):
    claim: str = Field(..., description="The claim to generate reasoning for")
    evidence: List[str] = Field(default_factory=list, description="Supporting evidence")
    reasoning_type: ReasoningType = Field(ReasoningType.DEDUCTIVE, description="Type of reasoning")
    complexity: str = Field("intermediate", description="Reasoning complexity level")
    max_steps: int = Field(7, description="Maximum reasoning steps to generate")
    use_llm: bool = Field(True, description="Use LLM for advanced reasoning")
    include_analysis: bool = Field(True, description="Include advanced analysis")
    
    class Config:
        json_schema_extra = {
            "example": {
                "claim": "Artificial intelligence will transform healthcare",
                "evidence": [
                    "AI diagnostic tools show 95% accuracy in medical imaging",
                    "Machine learning can predict disease outcomes with high precision",
                    "Robotic surgery reduces human error rates"
                ],
                "reasoning_type": "inductive",
                "complexity": "advanced",
                "max_steps": 5,
                "use_llm": True,
                "include_analysis": True
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
        json_schema_extra = {
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
    
    # Enhanced attributes for advanced reasoning
    fallacies: Optional[List[Dict]] = Field(default_factory=list, description="Detected logical fallacies")
    logical_gaps: Optional[List[Dict]] = Field(default_factory=list, description="Identified logical gaps")
    counterarguments: Optional[List[str]] = Field(default_factory=list, description="Generated counterarguments")
    premise_strength: Optional[Dict] = Field(default_factory=dict, description="Premise strength assessment")
    evidence_requirements: Optional[List[str]] = Field(default_factory=list, description="Required evidence")
    assumptions: Optional[List[str]] = Field(default_factory=list, description="Key assumptions")
    weaknesses: Optional[List[str]] = Field(default_factory=list, description="Potential weaknesses")


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


# Enhanced reasoning schemas
class ReasoningAnalysisRequest(BaseModel):
    reasoning_chain: ReasoningChain = Field(..., description="Reasoning chain to analyze")
    analysis_type: str = Field("full", description="Type of analysis to perform")
    include_fallacies: bool = Field(True, description="Include fallacy detection")
    include_gaps: bool = Field(True, description="Include gap analysis")
    include_counterarguments: bool = Field(True, description="Include counterargument generation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "reasoning_chain": {
                    "steps": [
                        {
                            "step_number": 1,
                            "text": "All humans are mortal",
                            "confidence": 0.9,
                            "type": "premise",
                            "evidence_used": []
                        }
                    ],
                    "reasoning_type": "deductive",
                    "overall_confidence": 0.85,
                    "logical_validity": 0.8
                },
                "analysis_type": "full",
                "include_fallacies": True,
                "include_gaps": True,
                "include_counterarguments": True
            }
        }


class ReasoningValidationRequest(BaseModel):
    claim: str = Field(..., description="Claim to validate")
    reasoning_steps: List[str] = Field(..., description="Reasoning steps to validate")
    evidence: List[str] = Field(default_factory=list, description="Supporting evidence")
    reasoning_type: ReasoningType = Field(ReasoningType.DEDUCTIVE, description="Type of reasoning")
    
    class Config:
        json_schema_extra = {
            "example": {
                "claim": "Climate change requires immediate action",
                "reasoning_steps": [
                    "Global temperatures have risen significantly",
                    "Human activities are the primary cause",
                    "Current trends will lead to severe consequences",
                    "Therefore, immediate action is necessary"
                ],
                "evidence": [
                    "IPCC reports show 1.1°C warming since pre-industrial times",
                    "97% of climate scientists agree on human causation"
                ],
                "reasoning_type": "deductive"
            }
        }


class LogicalGapAnalysis(BaseModel):
    gap_type: str
    description: str
    severity: float = Field(ge=0.0, le=1.0, description="Severity score 0-1")
    suggestion: str
    location: Optional[int] = Field(None, description="Step number where gap occurs")


class FallacyDetection(BaseModel):
    fallacy_type: str
    description: str
    confidence: float = Field(ge=0.0, le=1.0, description="Detection confidence 0-1")
    location: Optional[Tuple[int, int]] = Field(None, description="Character span in text")
    text_excerpt: Optional[str] = Field(None, description="Relevant text excerpt")
    severity: Optional[float] = Field(None, ge=0.0, le=1.0, description="Fallacy severity")


class ReasoningStrengthening(BaseModel):
    original_claim: str
    strengthened_reasoning: ReasoningChain
    improvements: List[str] = Field(description="List of improvements made")
    strength_increase: float = Field(description="Quantified improvement in reasoning strength")
    additional_evidence_needed: List[str] = Field(default_factory=list)


class MultiClaimReasoningRequest(BaseModel):
    claims: List[str] = Field(..., description="Multiple related claims")
    relationships: List[Dict] = Field(default_factory=list, description="Known relationships between claims")
    reasoning_type: ReasoningType = Field(ReasoningType.DEDUCTIVE)
    max_depth: int = Field(3, description="Maximum reasoning depth")
    include_cross_validation: bool = Field(True, description="Cross-validate reasoning between claims")
    
    class Config:
        json_schema_extra = {
            "example": {
                "claims": [
                    "Renewable energy is cost-effective",
                    "Solar panel costs have decreased dramatically",
                    "Government subsidies support renewable adoption"
                ],
                "relationships": [
                    {"type": "supports", "source": 1, "target": 0, "strength": 0.8},
                    {"type": "supports", "source": 2, "target": 0, "strength": 0.6}
                ],
                "reasoning_type": "inductive",
                "max_depth": 3,
                "include_cross_validation": True
            }
        }


class ReasoningNetworkResponse(BaseModel):
    primary_reasoning_chains: List[ReasoningChain]
    cross_claim_analysis: Dict = Field(default_factory=dict)
    network_validity: float = Field(description="Overall network reasoning validity")
    inconsistencies: List[str] = Field(default_factory=list)
    strengthening_suggestions: List[str] = Field(default_factory=list)
    processing_time: float
    metadata: Dict = Field(default_factory=dict)