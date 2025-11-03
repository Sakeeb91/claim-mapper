from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import uvicorn
import random
import time

app = FastAPI(title="Claim Mapper ML Service", version="1.0.0")

class ClaimExtractRequest(BaseModel):
    text: str
    source_url: str = ""

class ClaimAnalysisRequest(BaseModel):
    claim_text: str

class ExtractedClaim(BaseModel):
    id: str
    text: str
    type: str
    confidence: float
    entities: List[Dict]
    semantic_embedding: List[float]

class AnalysisResult(BaseModel):
    quality_score: float
    reasoning_chain: List[str]
    fallacies: List[str]
    evidence_needed: List[str]

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ML Service", "version": "1.0.0"}

@app.post("/extract", response_model=List[ExtractedClaim])
async def extract_claims(request: ClaimExtractRequest):
    """Extract claims from text using AI"""
    # Simulate processing time
    time.sleep(0.5)
    
    # Generate mock claims for demo
    sample_claims = [
        {
            "id": f"claim_{random.randint(1000, 9999)}",
            "text": "AI systems will exceed human intelligence by 2030",
            "type": "claim",
            "confidence": 0.85,
            "entities": [{"text": "AI systems", "label": "TECHNOLOGY"}, {"text": "2030", "label": "DATE"}],
            "semantic_embedding": [random.random() for _ in range(10)]
        },
        {
            "id": f"claim_{random.randint(1000, 9999)}",
            "text": "Current safety measures are insufficient for AGI development",
            "type": "premise",
            "confidence": 0.78,
            "entities": [{"text": "safety measures", "label": "CONCEPT"}, {"text": "AGI", "label": "TECHNOLOGY"}],
            "semantic_embedding": [random.random() for _ in range(10)]
        }
    ]
    
    return sample_claims

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_claim(request: ClaimAnalysisRequest):
    """Analyze claim quality and generate reasoning"""
    time.sleep(0.3)
    
    return AnalysisResult(
        quality_score=random.uniform(0.6, 0.9),
        reasoning_chain=[
            "The claim makes a specific prediction about AI development",
            "It includes a concrete timeline (2030)",
            "The claim is testable and falsifiable",
            "However, it lacks supporting evidence"
        ],
        fallacies=["Appeal to probability", "Hasty generalization"],
        evidence_needed=[
            "Current AI capability metrics",
            "Expert consensus on development timelines",
            "Historical precedents in technology development"
        ]
    )

@app.get("/similarity")
async def find_similar_claims(claim_text: str, limit: int = 5):
    """Find semantically similar claims"""
    time.sleep(0.2)
    
    similar_claims = []
    for i in range(min(limit, 3)):
        similar_claims.append({
            "id": f"similar_{i+1}",
            "text": f"Related claim about AI development {i+1}",
            "similarity_score": random.uniform(0.7, 0.95),
            "type": "claim"
        })
    
    return {"similar_claims": similar_claims}

if __name__ == "__main__":
    uvicorn.run(
        "demo_service:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    )