"""
Claim Mapper ML Service
FastAPI application for AI-powered claim analysis and reasoning
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
from loguru import logger

from services.claim_extractor import ClaimExtractor
from services.reasoning_engine import ReasoningEngine
from services.graph_analyzer import GraphAnalyzer
from services.argument_miner import ArgumentMiner
from services.semantic_analyzer import SemanticAnalyzer
from services.entity_extractor import EntityExtractor
from services.quality_scorer import QualityScorer
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
argument_miner: Optional[ArgumentMiner] = None
semantic_analyzer: Optional[SemanticAnalyzer] = None
entity_extractor: Optional[EntityExtractor] = None
quality_scorer: Optional[QualityScorer] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize ML models on startup"""
    global claim_extractor, reasoning_engine, graph_analyzer, argument_miner, semantic_analyzer, entity_extractor, quality_scorer
    
    logger.info("Loading ML models...")
    
    try:
        claim_extractor = ClaimExtractor()
        reasoning_engine = ReasoningEngine()
        graph_analyzer = GraphAnalyzer()
        argument_miner = ArgumentMiner()
        semantic_analyzer = SemanticAnalyzer()
        entity_extractor = EntityExtractor()
        quality_scorer = QualityScorer()
        
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
            "argument_miner": argument_miner is not None,
            "semantic_analyzer": semantic_analyzer is not None,
            "entity_extractor": entity_extractor is not None,
            "quality_scorer": quality_scorer is not None,
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
            
            if processing_type in ["full", "arguments"]:
                # Extract arguments
                result = await argument_miner.extract_arguments(
                    text=doc.get("text", "")
                )
                logger.info(f"Processed document {i+1}/{len(documents)} for arguments")
            
            if processing_type in ["full", "entities"]:
                # Extract entities
                result = await entity_extractor.extract_entities(
                    text=doc.get("text", "")
                )
                logger.info(f"Processed document {i+1}/{len(documents)} for entities")
            
            if processing_type in ["full", "reasoning"]:
                # Generate reasoning (if claims exist)
                # This would integrate with the main API to fetch existing claims
                pass
        
        logger.info(f"Completed batch processing task {task_id}")
        
    except Exception as e:
        logger.error(f"Batch processing failed for task {task_id}: {e}")


# New API endpoints for advanced NLP capabilities

@app.post("/extract")
async def extract_claims_endpoint(
    text: str,
    source: Optional[str] = None,
    confidence_threshold: float = 0.7,
    extract_evidence: bool = True
):
    """Extract claims from text input"""
    if not claim_extractor:
        raise HTTPException(status_code=503, detail="Claim extractor not available")
    
    try:
        result = await claim_extractor.extract_claims(
            text=text,
            source=source,
            confidence_threshold=confidence_threshold,
            extract_evidence=extract_evidence
        )
        return result
    except Exception as e:
        logger.error(f"Claim extraction failed: {e}")
        raise HTTPException(status_code=500, detail="Claim extraction failed")


@app.post("/analyze")
async def analyze_claim_relationships(
    claims: List[Dict],
    include_clustering: bool = True,
    include_contradictions: bool = True
):
    """Analyze claim relationships"""
    if not semantic_analyzer:
        raise HTTPException(status_code=503, detail="Semantic analyzer not available")
    
    try:
        # Convert dict claims to ExtractedClaim objects
        from models.schemas import ExtractedClaim, ClaimType
        extracted_claims = [
            ExtractedClaim(
                text=claim['text'],
                type=ClaimType(claim.get('type', 'assertion')),
                confidence=claim.get('confidence', 0.7),
                position=claim.get('position', {'start': 0, 'end': len(claim['text'])}),
                keywords=claim.get('keywords', []),
                related_evidence=claim.get('related_evidence', [])
            )
            for claim in claims
        ]
        
        result = await semantic_analyzer.analyze_claim_relationships(
            claims=extracted_claims,
            include_clustering=include_clustering,
            include_contradictions=include_contradictions
        )
        return result
    except Exception as e:
        logger.error(f"Claim relationship analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Claim relationship analysis failed")


@app.post("/similarity")
async def find_similar_claims(
    query_claim: str,
    candidate_claims: List[str],
    top_k: int = 5,
    threshold: float = 0.5
):
    """Find similar claims"""
    if not semantic_analyzer:
        raise HTTPException(status_code=503, detail="Semantic analyzer not available")
    
    try:
        result = await semantic_analyzer.find_similar_claims(
            query_claim=query_claim,
            candidate_claims=candidate_claims,
            top_k=top_k,
            threshold=threshold
        )
        return {"query": query_claim, "similar_claims": result}
    except Exception as e:
        logger.error(f"Similar claim finding failed: {e}")
        raise HTTPException(status_code=500, detail="Similar claim finding failed")


@app.post("/entities")
async def extract_entities(
    text: str,
    confidence_threshold: float = 0.8,
    include_relationships: bool = True,
    entity_types: Optional[List[str]] = None
):
    """Extract named entities"""
    if not entity_extractor:
        raise HTTPException(status_code=503, detail="Entity extractor not available")
    
    try:
        result = await entity_extractor.extract_entities(
            text=text,
            confidence_threshold=confidence_threshold,
            include_relationships=include_relationships,
            entity_types=entity_types
        )
        return result
    except Exception as e:
        logger.error(f"Entity extraction failed: {e}")
        raise HTTPException(status_code=500, detail="Entity extraction failed")


@app.post("/validate")
async def validate_claim_quality(
    claim_text: str,
    claim_type: str = "assertion",
    context: str = "",
    source_info: Optional[Dict] = None,
    evidence: Optional[List[str]] = None
):
    """Validate claim quality"""
    if not quality_scorer:
        raise HTTPException(status_code=503, detail="Quality scorer not available")
    
    try:
        from models.schemas import ExtractedClaim, ClaimType
        
        # Create ExtractedClaim object
        claim = ExtractedClaim(
            text=claim_text,
            type=ClaimType(claim_type),
            confidence=0.7,
            position={'start': 0, 'end': len(claim_text)},
            keywords=[],
            related_evidence=evidence or []
        )
        
        metrics = await quality_scorer.assess_claim_quality(
            claim=claim,
            context=context,
            source_info=source_info,
            evidence=evidence
        )
        
        return {
            "overall_score": metrics.overall_score,
            "confidence_score": metrics.confidence_score,
            "clarity_score": metrics.clarity_score,
            "specificity_score": metrics.specificity_score,
            "evidence_score": metrics.evidence_score,
            "bias_score": metrics.bias_score,
            "factuality_score": metrics.factuality_score,
            "completeness_score": metrics.completeness_score,
            "reasoning_score": metrics.reasoning_score,
            "source_reliability": metrics.source_reliability,
            "issues": metrics.issues,
            "recommendations": metrics.recommendations,
            "linguistic_features": metrics.linguistic_features,
            "structural_features": metrics.structural_features,
            "semantic_features": metrics.semantic_features
        }
    except Exception as e:
        logger.error(f"Quality validation failed: {e}")
        raise HTTPException(status_code=500, detail="Quality validation failed")


@app.post("/mine-arguments")
async def mine_arguments(
    text: str,
    confidence_threshold: float = 0.6,
    extract_relations: bool = True
):
    """Mine argument structure from text"""
    if not argument_miner:
        raise HTTPException(status_code=503, detail="Argument miner not available")
    
    try:
        result = await argument_miner.extract_arguments(
            text=text,
            confidence_threshold=confidence_threshold,
            extract_relations=extract_relations
        )
        return result
    except Exception as e:
        logger.error(f"Argument mining failed: {e}")
        raise HTTPException(status_code=500, detail="Argument mining failed")


@app.post("/analyze-arguments")
async def analyze_argument_structure(
    arguments: List[Dict],
    relations: List[Dict]
):
    """Analyze argument structure"""
    if not argument_miner:
        raise HTTPException(status_code=503, detail="Argument miner not available")
    
    try:
        result = await argument_miner.analyze_argument_structure(
            arguments=arguments,
            relations=relations
        )
        return result
    except Exception as e:
        logger.error(f"Argument structure analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Argument structure analysis failed")


@app.post("/extract-domain-entities")
async def extract_domain_entities(
    text: str,
    domain: str = "academic"
):
    """Extract domain-specific entities"""
    if not entity_extractor:
        raise HTTPException(status_code=503, detail="Entity extractor not available")
    
    try:
        result = await entity_extractor.extract_domain_entities(
            text=text,
            domain=domain
        )
        return result
    except Exception as e:
        logger.error(f"Domain entity extraction failed: {e}")
        raise HTTPException(status_code=500, detail="Domain entity extraction failed")


@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket):
    """WebSocket endpoint for real-time processing"""
    await websocket.accept()
    
    try:
        while True:
            # Receive data from client
            data = await websocket.receive_json()
            
            processing_type = data.get('type', 'extract')
            text = data.get('text', '')
            
            if processing_type == 'extract' and claim_extractor:
                result = await claim_extractor.extract_claims(text=text)
                await websocket.send_json({
                    'type': 'claims',
                    'data': result.dict() if hasattr(result, 'dict') else result
                })
            
            elif processing_type == 'entities' and entity_extractor:
                result = await entity_extractor.extract_entities(text=text)
                await websocket.send_json({
                    'type': 'entities',
                    'data': result
                })
            
            elif processing_type == 'arguments' and argument_miner:
                result = await argument_miner.extract_arguments(text=text)
                await websocket.send_json({
                    'type': 'arguments',
                    'data': result
                })
            
            else:
                await websocket.send_json({
                    'type': 'error',
                    'message': 'Unsupported processing type or service unavailable'
                })
                
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8002)),
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info"
    )