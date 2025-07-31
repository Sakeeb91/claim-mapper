"""
Claim Mapper ML Service
FastAPI application for AI-powered claim analysis and reasoning
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
from loguru import logger

from services.claim_extractor import ClaimExtractor
from services.reasoning_engine import ReasoningEngine
from services.graph_analyzer import GraphAnalyzer
from models.schemas import (
    ClaimExtractionRequest,
    ClaimExtractionResponse,
    ReasoningRequest,
    ReasoningResponse,
    GraphAnalysisRequest,
    GraphAnalysisResponse,
)

# Global ML models
claim_extractor: Optional[ClaimExtractor] = None
reasoning_engine: Optional[ReasoningEngine] = None
graph_analyzer: Optional[GraphAnalyzer] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize ML models on startup"""
    global claim_extractor, reasoning_engine, graph_analyzer
    
    logger.info("Loading ML models...")
    
    try:
        claim_extractor = ClaimExtractor()
        reasoning_engine = ReasoningEngine()
        graph_analyzer = GraphAnalyzer()
        
        logger.info("ML models loaded successfully")
        yield
        
    except Exception as e:
        logger.error(f"Failed to load ML models: {e}")
        raise
    
    finally:
        logger.info("Shutting down ML service")


app = FastAPI(
    title="Claim Mapper ML Service",
    description="AI-powered claim analysis and reasoning engine",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": {
            "claim_extractor": claim_extractor is not None,
            "reasoning_engine": reasoning_engine is not None,
            "graph_analyzer": graph_analyzer is not None,
        }
    }


@app.post("/extract-claims", response_model=ClaimExtractionResponse)
async def extract_claims(request: ClaimExtractionRequest):
    """Extract claims from text using NLP models"""
    if not claim_extractor:
        raise HTTPException(status_code=503, detail="Claim extractor not available")
    
    try:
        result = await claim_extractor.extract_claims(
            text=request.text,
            source=request.source,
            confidence_threshold=request.confidence_threshold,
        )
        return result
    except Exception as e:
        logger.error(f"Claim extraction failed: {e}")
        raise HTTPException(status_code=500, detail="Claim extraction failed")


@app.post("/generate-reasoning", response_model=ReasoningResponse)
async def generate_reasoning(request: ReasoningRequest):
    """Generate reasoning chains for claims"""
    if not reasoning_engine:
        raise HTTPException(status_code=503, detail="Reasoning engine not available")
    
    try:
        result = await reasoning_engine.generate_reasoning(
            claim=request.claim,
            evidence=request.evidence,
            reasoning_type=request.reasoning_type,
        )
        return result
    except Exception as e:
        logger.error(f"Reasoning generation failed: {e}")
        raise HTTPException(status_code=500, detail="Reasoning generation failed")


@app.post("/analyze-graph", response_model=GraphAnalysisResponse)
async def analyze_graph(request: GraphAnalysisRequest):
    """Analyze knowledge graph structure and relationships"""
    if not graph_analyzer:
        raise HTTPException(status_code=503, detail="Graph analyzer not available")
    
    try:
        result = await graph_analyzer.analyze_graph(
            nodes=request.nodes,
            links=request.links,
            analysis_type=request.analysis_type,
        )
        return result
    except Exception as e:
        logger.error(f"Graph analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Graph analysis failed")


@app.post("/similarity-search")
async def similarity_search(
    query: str,
    texts: List[str],
    top_k: int = 5
):
    """Find most similar texts to a query using semantic similarity"""
    if not claim_extractor:
        raise HTTPException(status_code=503, detail="ML models not available")
    
    try:
        similarities = await claim_extractor.compute_similarities(query, texts)
        
        # Sort by similarity and return top_k
        sorted_results = sorted(
            enumerate(similarities),
            key=lambda x: x[1],
            reverse=True
        )[:top_k]
        
        return {
            "query": query,
            "results": [
                {
                    "text": texts[idx],
                    "similarity": float(score),
                    "rank": rank + 1
                }
                for rank, (idx, score) in enumerate(sorted_results)
            ]
        }
    except Exception as e:
        logger.error(f"Similarity search failed: {e}")
        raise HTTPException(status_code=500, detail="Similarity search failed")


@app.post("/batch-process")
async def batch_process(
    background_tasks: BackgroundTasks,
    documents: List[Dict],
    processing_type: str = "full"
):
    """Process multiple documents in the background"""
    task_id = f"batch_{len(documents)}_{processing_type}"
    
    background_tasks.add_task(
        process_documents_batch,
        documents,
        processing_type,
        task_id
    )
    
    return {
        "task_id": task_id,
        "status": "processing",
        "document_count": len(documents)
    }


async def process_documents_batch(documents: List[Dict], processing_type: str, task_id: str):
    """Background task for batch processing"""
    logger.info(f"Starting batch processing task {task_id}")
    
    try:
        for i, doc in enumerate(documents):
            if processing_type in ["full", "claims"]:
                # Extract claims
                result = await claim_extractor.extract_claims(
                    text=doc.get("text", ""),
                    source=doc.get("source", "unknown")
                )
                logger.info(f"Processed document {i+1}/{len(documents)} for claims")
            
            if processing_type in ["full", "reasoning"]:
                # Generate reasoning (if claims exist)
                # This would integrate with the main API to fetch existing claims
                pass
        
        logger.info(f"Completed batch processing task {task_id}")
        
    except Exception as e:
        logger.error(f"Batch processing failed for task {task_id}: {e}")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8002)),
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info"
    )