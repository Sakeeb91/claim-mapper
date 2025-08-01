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
from services.reasoning_engine import ReasoningEngine, ReasoningChainGenerator
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
    AdvancedReasoningRequest,
    ReasoningAnalysisRequest,
    ReasoningValidationRequest,
    MultiClaimReasoningRequest,
    ReasoningNetworkResponse,
    ReasoningStrengthening,
    GraphAnalysisRequest,
    GraphAnalysisResponse,
)

# Global ML models
claim_extractor: Optional[ClaimExtractor] = None
reasoning_engine: Optional[ReasoningEngine] = None
reasoning_chain_generator: Optional[ReasoningChainGenerator] = None
graph_analyzer: Optional[GraphAnalyzer] = None
argument_miner: Optional[ArgumentMiner] = None
semantic_analyzer: Optional[SemanticAnalyzer] = None
entity_extractor: Optional[EntityExtractor] = None
quality_scorer: Optional[QualityScorer] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize ML models on startup"""
    global claim_extractor, reasoning_engine, reasoning_chain_generator, graph_analyzer, argument_miner, semantic_analyzer, entity_extractor, quality_scorer
    
    logger.info("Loading ML models...")
    
    try:
        claim_extractor = ClaimExtractor()
        reasoning_engine = ReasoningEngine()
        reasoning_chain_generator = ReasoningChainGenerator()
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
            "reasoning_chain_generator": reasoning_chain_generator is not None,
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


# Advanced Reasoning API Endpoints

@app.post("/reasoning/generate")
async def generate_advanced_reasoning(request: AdvancedReasoningRequest):
    """Generate advanced reasoning chains with comprehensive analysis"""
    if not reasoning_chain_generator:
        raise HTTPException(status_code=503, detail="Reasoning chain generator not available")
    
    try:
        result = await reasoning_chain_generator.generate_reasoning_chain(
            claim=request.claim,
            evidence=request.evidence,
            reasoning_type=request.reasoning_type,
            complexity=request.complexity,
            max_steps=request.max_steps,
            use_llm=request.use_llm
        )
        return result
    except Exception as e:
        logger.error(f"Advanced reasoning generation failed: {e}")
        raise HTTPException(status_code=500, detail="Advanced reasoning generation failed")


@app.post("/reasoning/analyze")
async def analyze_reasoning_chain(request: ReasoningAnalysisRequest):
    """Analyze existing reasoning chain for fallacies, gaps, and weaknesses"""
    if not reasoning_chain_generator:
        raise HTTPException(status_code=503, detail="Reasoning chain generator not available")
    
    try:
        chain = request.reasoning_chain
        analysis_results = {}
        
        if request.include_fallacies:
            analysis_results["fallacies"] = await reasoning_chain_generator._detect_fallacies(chain)
        
        if request.include_gaps:
            analysis_results["logical_gaps"] = await reasoning_chain_generator._identify_logical_gaps(chain, [])
        
        if request.include_counterarguments:
            # Extract claim from first step or use a placeholder
            claim = chain.steps[0].text if chain.steps else "Unknown claim"
            analysis_results["counterarguments"] = await reasoning_chain_generator._generate_counterarguments(claim, chain)
        
        # Additional analysis
        analysis_results["premise_strength"] = await reasoning_chain_generator._assess_premise_strength(chain)
        analysis_results["evidence_requirements"] = await reasoning_chain_generator._identify_evidence_requirements(chain)
        
        return {
            "analysis_type": request.analysis_type,
            "chain_id": getattr(chain, 'id', 'unknown'),
            "overall_quality": chain.logical_validity,
            "confidence": chain.overall_confidence,
            "analysis_results": analysis_results,
            "recommendations": _generate_improvement_recommendations(analysis_results)
        }
        
    except Exception as e:
        logger.error(f"Reasoning chain analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Reasoning chain analysis failed")


@app.post("/reasoning/validate")
async def validate_reasoning_logic(request: ReasoningValidationRequest):
    """Validate the logical structure and validity of reasoning steps"""
    if not reasoning_chain_generator:
        raise HTTPException(status_code=503, detail="Reasoning chain generator not available")
    
    try:
        # Convert reasoning steps to ReasoningStep objects
        from models.schemas import ReasoningStep, ReasoningChain
        
        steps = [
            ReasoningStep(
                step_number=i+1,
                text=step_text,
                confidence=0.8,  # Default confidence
                type="inference",  # Default type
                evidence_used=[]
            )
            for i, step_text in enumerate(request.reasoning_steps)
        ]
        
        # Create temporary reasoning chain
        temp_chain = ReasoningChain(
            steps=steps,
            reasoning_type=request.reasoning_type,
            overall_confidence=0.8,
            logical_validity=0.0  # Will be calculated
        )
        
        # Validate logical structure
        logical_validity = await reasoning_chain_generator._assess_logical_validity(steps, request.reasoning_type)
        temp_chain.logical_validity = logical_validity
        
        # Identify issues
        logical_gaps = await reasoning_chain_generator._identify_logical_gaps(temp_chain, request.evidence)
        fallacies = await reasoning_chain_generator._detect_fallacies(temp_chain)
        
        # Calculate validation score
        validation_score = logical_validity
        if logical_gaps:
            validation_score -= len(logical_gaps) * 0.1
        if fallacies:
            validation_score -= len(fallacies) * 0.15
        validation_score = max(0.0, min(1.0, validation_score))
        
        return {
            "claim": request.claim,
            "reasoning_type": request.reasoning_type,
            "validation_score": validation_score,
            "logical_validity": logical_validity,
            "is_valid": validation_score > 0.6,
            "issues": {
                "logical_gaps": logical_gaps,
                "fallacies": fallacies
            },
            "step_analysis": [
                {
                    "step_number": step.step_number,
                    "text": step.text,
                    "confidence": step.confidence,
                    "type": step.type
                }
                for step in steps
            ],
            "recommendations": _generate_validation_recommendations(logical_gaps, fallacies)
        }
        
    except Exception as e:
        logger.error(f"Reasoning validation failed: {e}")
        raise HTTPException(status_code=500, detail="Reasoning validation failed")


@app.post("/reasoning/gaps")
async def identify_reasoning_gaps(
    claim: str,
    reasoning_steps: List[str],
    evidence: List[str] = [],
    reasoning_type: str = "deductive"
):
    """Identify logical gaps and missing elements in reasoning"""
    if not reasoning_chain_generator:
        raise HTTPException(status_code=503, detail="Reasoning chain generator not available")
    
    try:
        from models.schemas import ReasoningStep, ReasoningChain, ReasoningType
        
        # Convert to structured format
        steps = [
            ReasoningStep(
                step_number=i+1,
                text=step_text,
                confidence=0.8,
                type="inference",
                evidence_used=[]
            )
            for i, step_text in enumerate(reasoning_steps)
        ]
        
        temp_chain = ReasoningChain(
            steps=steps,
            reasoning_type=ReasoningType(reasoning_type),
            overall_confidence=0.8,
            logical_validity=0.8
        )
        
        # Identify gaps
        logical_gaps = await reasoning_chain_generator._identify_logical_gaps(temp_chain, evidence)
        evidence_requirements = await reasoning_chain_generator._identify_evidence_requirements(temp_chain)
        
        return {
            "claim": claim,
            "reasoning_type": reasoning_type,
            "logical_gaps": logical_gaps,
            "evidence_requirements": evidence_requirements,
            "gap_severity": sum(gap.get("severity", 0.5) for gap in logical_gaps) / len(logical_gaps) if logical_gaps else 0.0,
            "recommendations": {
                "critical_gaps": [gap for gap in logical_gaps if gap.get("severity", 0) > 0.7],
                "evidence_needed": evidence_requirements,
                "improvement_suggestions": _generate_gap_filling_suggestions(logical_gaps)
            }
        }
        
    except Exception as e:
        logger.error(f"Gap identification failed: {e}")
        raise HTTPException(status_code=500, detail="Gap identification failed")


@app.post("/reasoning/strengthen")
async def strengthen_reasoning(
    claim: str,
    reasoning_steps: List[str],
    evidence: List[str] = [],
    reasoning_type: str = "deductive",
    complexity: str = "intermediate"
):
    """Suggest improvements to strengthen reasoning chain"""
    if not reasoning_chain_generator:
        raise HTTPException(status_code=503, detail="Reasoning chain generator not available")
    
    try:
        from models.schemas import ReasoningType
        
        # Generate improved reasoning chain
        improved_result = await reasoning_chain_generator.generate_reasoning_chain(
            claim=claim,
            evidence=evidence,
            reasoning_type=ReasoningType(reasoning_type),
            complexity=complexity,
            max_steps=len(reasoning_steps) + 2,  # Allow for additional steps
            use_llm=True
        )
        
        if not improved_result.reasoning_chains:
            raise HTTPException(status_code=500, detail="Could not generate improved reasoning")
        
        improved_chain = improved_result.reasoning_chains[0]
        
        # Compare with original
        original_strength = len(reasoning_steps) * 0.6  # Simple baseline
        improved_strength = improved_chain.logical_validity * improved_chain.overall_confidence
        
        improvements = []
        if improved_strength > original_strength:
            improvements.append("Enhanced logical structure")
        if len(improved_chain.steps) > len(reasoning_steps):
            improvements.append("Added intermediate reasoning steps")
        if hasattr(improved_chain, 'evidence_requirements') and improved_chain.evidence_requirements:
            improvements.append("Identified additional evidence requirements")
        
        return {
            "original_claim": claim,
            "strengthened_reasoning": {
                "steps": [
                    {
                        "step_number": step.step_number,
                        "text": step.text,
                        "confidence": step.confidence,
                        "type": step.type
                    }
                    for step in improved_chain.steps
                ],
                "reasoning_type": improved_chain.reasoning_type,
                "overall_confidence": improved_chain.overall_confidence,
                "logical_validity": improved_chain.logical_validity
            },
            "improvements": improvements,
            "strength_increase": improved_strength - original_strength,
            "additional_evidence_needed": getattr(improved_chain, 'evidence_requirements', []),
            "quality_metrics": {
                "original_steps": len(reasoning_steps),
                "improved_steps": len(improved_chain.steps),
                "confidence_improvement": improved_chain.overall_confidence - 0.6,  # baseline
                "validity_score": improved_chain.logical_validity
            }
        }
        
    except Exception as e:
        logger.error(f"Reasoning strengthening failed: {e}")
        raise HTTPException(status_code=500, detail="Reasoning strengthening failed")


@app.post("/reasoning/multi-claim", response_model=ReasoningNetworkResponse)
async def analyze_multi_claim_reasoning(request: MultiClaimReasoningRequest):
    """Analyze reasoning networks across multiple related claims"""
    if not reasoning_chain_generator:
        raise HTTPException(status_code=503, detail="Reasoning chain generator not available")
    
    try:
        start_time = asyncio.get_event_loop().time()
        
        # Generate reasoning chains for each claim
        primary_chains = []
        for claim in request.claims:
            result = await reasoning_chain_generator.generate_reasoning_chain(
                claim=claim,
                evidence=[],  # Could be enhanced to use claim-specific evidence
                reasoning_type=request.reasoning_type,
                max_steps=request.max_depth + 2,
                use_llm=True
            )
            if result.reasoning_chains:
                primary_chains.extend(result.reasoning_chains)
        
        # Analyze cross-claim relationships
        cross_claim_analysis = await _analyze_cross_claim_relationships(
            request.claims, 
            primary_chains,
            request.relationships
        )
        
        # Calculate network validity
        if primary_chains:
            network_validity = sum(chain.logical_validity for chain in primary_chains) / len(primary_chains)
        else:
            network_validity = 0.0
        
        # Identify inconsistencies
        inconsistencies = await _identify_claim_inconsistencies(request.claims, primary_chains)
        
        # Generate strengthening suggestions
        strengthening_suggestions = _generate_network_strengthening_suggestions(
            cross_claim_analysis, inconsistencies
        )
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        return ReasoningNetworkResponse(
            primary_reasoning_chains=primary_chains,
            cross_claim_analysis=cross_claim_analysis,
            network_validity=network_validity,
            inconsistencies=inconsistencies,
            strengthening_suggestions=strengthening_suggestions,
            processing_time=processing_time,
            metadata={
                "claim_count": len(request.claims),
                "relationship_count": len(request.relationships),
                "reasoning_type": request.reasoning_type,
                "max_depth": request.max_depth
            }
        )
        
    except Exception as e:
        logger.error(f"Multi-claim reasoning analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Multi-claim reasoning analysis failed")


# Helper functions for the new endpoints

def _generate_improvement_recommendations(analysis_results: Dict) -> List[str]:
    """Generate recommendations based on analysis results"""
    recommendations = []
    
    if analysis_results.get("fallacies"):
        recommendations.append("Address identified logical fallacies to strengthen the argument")
    
    if analysis_results.get("logical_gaps"):
        gap_count = len(analysis_results["logical_gaps"])
        recommendations.append(f"Fill {gap_count} logical gap(s) to improve reasoning continuity")
    
    premise_strength = analysis_results.get("premise_strength", {})
    if premise_strength.get("overall_strength", 1.0) < 0.7:
        recommendations.append("Strengthen premises with additional evidence or justification")
    
    if analysis_results.get("evidence_requirements"):
        recommendations.append("Gather additional evidence as identified in requirements")
    
    return recommendations


def _generate_validation_recommendations(logical_gaps: List, fallacies: List) -> List[str]:
    """Generate recommendations for reasoning validation"""
    recommendations = []
    
    if logical_gaps:
        high_severity_gaps = [gap for gap in logical_gaps if gap.get("severity", 0) > 0.7]
        if high_severity_gaps:
            recommendations.append("Address critical logical gaps before proceeding")
        else:
            recommendations.append("Consider filling minor logical gaps for stronger reasoning")
    
    if fallacies:
        recommendations.append("Revise reasoning to eliminate logical fallacies")
    
    if not logical_gaps and not fallacies:
        recommendations.append("Reasoning structure appears logically sound")
    
    return recommendations


def _generate_gap_filling_suggestions(logical_gaps: List) -> List[str]:
    """Generate specific suggestions for filling logical gaps"""
    suggestions = []
    
    for gap in logical_gaps:
        gap_type = gap.get("type", "unknown")
        
        if gap_type == "missing_premise":
            suggestions.append("Add foundational premises to support your reasoning")
        elif gap_type == "weak_connection":
            suggestions.append("Strengthen logical connections between reasoning steps")
        elif gap_type == "unsupported_assumption":
            suggestions.append("Provide evidence or justification for assumptions")
        else:
            suggestions.append(f"Address {gap_type} to improve reasoning quality")
    
    return suggestions


async def _analyze_cross_claim_relationships(
    claims: List[str], 
    chains: List, 
    relationships: List[Dict]
) -> Dict:
    """Analyze relationships between multiple claims and their reasoning"""
    try:
        analysis = {
            "claim_similarities": [],
            "reasoning_overlaps": [],
            "logical_dependencies": [],
            "strength_correlations": []
        }
        
        # Simple pairwise analysis
        for i, claim1 in enumerate(claims):
            for j, claim2 in enumerate(claims[i+1:], i+1):
                # Calculate basic similarity (would be enhanced with semantic analysis)
                common_words = set(claim1.lower().split()) & set(claim2.lower().split())
                similarity = len(common_words) / max(len(claim1.split()), len(claim2.split()))
                
                analysis["claim_similarities"].append({
                    "claim1_index": i,
                    "claim2_index": j,
                    "similarity": similarity,
                    "common_concepts": list(common_words)
                })
        
        return analysis
        
    except Exception as e:
        logger.error(f"Cross-claim analysis failed: {e}")
        return {}


async def _identify_claim_inconsistencies(
    claims: List[str], 
    chains: List
) -> List[str]:
    """Identify inconsistencies between claims and their reasoning"""
    inconsistencies = []
    
    # Simple heuristic checks
    if len(chains) != len(claims):
        inconsistencies.append("Mismatch between number of claims and reasoning chains")
    
    # Check for contradictory reasoning patterns
    reasoning_types = [chain.reasoning_type for chain in chains if hasattr(chain, 'reasoning_type')]
    if len(set(reasoning_types)) > 1:
        inconsistencies.append("Mixed reasoning types may create logical inconsistencies")
    
    return inconsistencies


def _generate_network_strengthening_suggestions(
    cross_claim_analysis: Dict, 
    inconsistencies: List[str]
) -> List[str]:
    """Generate suggestions for strengthening the overall reasoning network"""
    suggestions = []
    
    if inconsistencies:
        suggestions.append("Resolve identified inconsistencies between claims")
    
    similarities = cross_claim_analysis.get("claim_similarities", [])
    high_similarity_pairs = [s for s in similarities if s.get("similarity", 0) > 0.6]
    
    if high_similarity_pairs:
        suggestions.append("Consider consolidating highly similar claims for clearer reasoning")
    
    if len(similarities) > 3:
        suggestions.append("Organize claims hierarchically to improve logical flow")
    
    suggestions.append("Validate cross-claim dependencies to ensure logical consistency")
    
    return suggestions


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8002)),
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info"
    )