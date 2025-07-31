"""
Reasoning engine for generating logical reasoning chains
"""

import asyncio
from typing import List, Dict, Optional
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
from loguru import logger

from models.schemas import (
    ReasoningResponse, 
    ReasoningChain, 
    ReasoningStep, 
    ReasoningType
)


class ReasoningEngine:
    """Service for generating reasoning chains and logical inferences"""
    
    def __init__(self):
        self.generator = None
        self.tokenizer = None
        
        # Initialize models
        asyncio.create_task(self._load_models())
    
    async def _load_models(self):
        """Load reasoning models"""
        try:
            logger.info("Loading reasoning engine models...")
            
            # Load text generation pipeline for reasoning
            self.generator = pipeline(
                "text-generation",
                model="microsoft/DialoGPT-medium",
                tokenizer="microsoft/DialoGPT-medium",
                max_length=512,
                do_sample=True,
                temperature=0.7,
                pad_token_id=50256
            )
            
            logger.info("Reasoning engine models loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load reasoning models: {e}")
            raise
    
    async def generate_reasoning(
        self,
        claim: str,
        evidence: List[str],
        reasoning_type: ReasoningType = ReasoningType.DEDUCTIVE,
        max_steps: int = 5
    ) -> ReasoningResponse:
        """Generate reasoning chains for a claim"""
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Generate reasoning chains based on type
            if reasoning_type == ReasoningType.DEDUCTIVE:
                chains = await self._generate_deductive_reasoning(claim, evidence, max_steps)
            elif reasoning_type == ReasoningType.INDUCTIVE:
                chains = await self._generate_inductive_reasoning(claim, evidence, max_steps)
            else:  # ABDUCTIVE
                chains = await self._generate_abductive_reasoning(claim, evidence, max_steps)
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            return ReasoningResponse(
                reasoning_chains=chains,
                processing_time=processing_time,
                model_version="reasoning-engine-v1.0",
                metadata={
                    "claim": claim,
                    "evidence_count": len(evidence),
                    "reasoning_type": reasoning_type
                }
            )
            
        except Exception as e:
            logger.error(f"Reasoning generation failed: {e}")
            raise
    
    async def _generate_deductive_reasoning(
        self, 
        claim: str, 
        evidence: List[str], 
        max_steps: int
    ) -> List[ReasoningChain]:
        """Generate deductive reasoning chain"""
        try:
            # Construct deductive reasoning prompt
            prompt = self._build_deductive_prompt(claim, evidence)
            
            # Generate reasoning steps
            steps = await self._generate_reasoning_steps(prompt, max_steps, "deductive")
            
            # Calculate overall confidence and validity
            overall_confidence = sum(step.confidence for step in steps) / len(steps) if steps else 0.0
            logical_validity = await self._assess_logical_validity(steps, ReasoningType.DEDUCTIVE)
            
            chain = ReasoningChain(
                steps=steps,
                reasoning_type=ReasoningType.DEDUCTIVE,
                overall_confidence=overall_confidence,
                logical_validity=logical_validity
            )
            
            return [chain]
            
        except Exception as e:
            logger.error(f"Deductive reasoning generation failed: {e}")
            return []
    
    async def _generate_inductive_reasoning(
        self, 
        claim: str, 
        evidence: List[str], 
        max_steps: int
    ) -> List[ReasoningChain]:
        """Generate inductive reasoning chain"""
        try:
            # Construct inductive reasoning prompt
            prompt = self._build_inductive_prompt(claim, evidence)
            
            # Generate reasoning steps
            steps = await self._generate_reasoning_steps(prompt, max_steps, "inductive")
            
            # Calculate overall confidence and validity
            overall_confidence = sum(step.confidence for step in steps) / len(steps) if steps else 0.0
            logical_validity = await self._assess_logical_validity(steps, ReasoningType.INDUCTIVE)
            
            chain = ReasoningChain(
                steps=steps,
                reasoning_type=ReasoningType.INDUCTIVE,
                overall_confidence=overall_confidence,
                logical_validity=logical_validity
            )
            
            return [chain]
            
        except Exception as e:
            logger.error(f"Inductive reasoning generation failed: {e}")
            return []
    
    async def _generate_abductive_reasoning(
        self, 
        claim: str, 
        evidence: List[str], 
        max_steps: int
    ) -> List[ReasoningChain]:
        """Generate abductive reasoning chain"""
        try:
            # Construct abductive reasoning prompt
            prompt = self._build_abductive_prompt(claim, evidence)
            
            # Generate reasoning steps
            steps = await self._generate_reasoning_steps(prompt, max_steps, "abductive")
            
            # Calculate overall confidence and validity
            overall_confidence = sum(step.confidence for step in steps) / len(steps) if steps else 0.0
            logical_validity = await self._assess_logical_validity(steps, ReasoningType.ABDUCTIVE)
            
            chain = ReasoningChain(
                steps=steps,
                reasoning_type=ReasoningType.ABDUCTIVE,
                overall_confidence=overall_confidence,
                logical_validity=logical_validity
            )
            
            return [chain]
            
        except Exception as e:
            logger.error(f"Abductive reasoning generation failed: {e}")
            return []
    
    def _build_deductive_prompt(self, claim: str, evidence: List[str]) -> str:
        """Build prompt for deductive reasoning"""
        evidence_text = "\n".join([f"- {ev}" for ev in evidence])
        
        return f"""
Given the following evidence:
{evidence_text}

Using deductive reasoning, provide step-by-step logical reasoning to support or refute the claim: "{claim}"

Format your response as numbered steps:
1. [premise/inference/conclusion]: [reasoning step]
2. [premise/inference/conclusion]: [reasoning step]
...
"""
    
    def _build_inductive_prompt(self, claim: str, evidence: List[str]) -> str:
        """Build prompt for inductive reasoning"""
        evidence_text = "\n".join([f"- {ev}" for ev in evidence])
        
        return f"""
Given the following observations:
{evidence_text}

Using inductive reasoning, provide step-by-step logical reasoning to support the general claim: "{claim}"

Format your response as numbered steps:
1. [premise/inference/conclusion]: [reasoning step]
2. [premise/inference/conclusion]: [reasoning step]
...
"""
    
    def _build_abductive_prompt(self, claim: str, evidence: List[str]) -> str:
        """Build prompt for abductive reasoning"""
        evidence_text = "\n".join([f"- {ev}" for ev in evidence])
        
        return f"""
Given the following observations:
{evidence_text}

Using abductive reasoning, provide the best explanation for why "{claim}" might be true.

Format your response as numbered steps:
1. [premise/inference/conclusion]: [reasoning step]
2. [premise/inference/conclusion]: [reasoning step]
...
"""
    
    async def _generate_reasoning_steps(
        self, 
        prompt: str, 
        max_steps: int, 
        reasoning_type: str
    ) -> List[ReasoningStep]:
        """Generate individual reasoning steps"""
        try:
            if not self.generator:
                return []
            
            # Generate text
            generated = self.generator(prompt, max_length=len(prompt) + 200, num_return_sequences=1)
            generated_text = generated[0]['generated_text']
            
            # Parse generated text into steps
            steps = self._parse_reasoning_steps(generated_text, reasoning_type)
            
            return steps[:max_steps]
            
        except Exception as e:
            logger.error(f"Reasoning step generation failed: {e}")
            return []
    
    def _parse_reasoning_steps(self, generated_text: str, reasoning_type: str) -> List[ReasoningStep]:
        """Parse generated text into structured reasoning steps"""
        try:
            steps = []
            lines = generated_text.split('\n')
            
            step_number = 1
            for line in lines:
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith('- ')):
                    # Extract step content
                    if ':' in line:
                        type_part, content = line.split(':', 1)
                        step_type = self._extract_step_type(type_part)
                        content = content.strip()
                    else:
                        content = line
                        step_type = "inference"  # default
                    
                    if content:
                        step = ReasoningStep(
                            step_number=step_number,
                            text=content,
                            confidence=0.8,  # Default confidence
                            type=step_type,
                            evidence_used=[]  # Would be populated by analyzing content
                        )
                        steps.append(step)
                        step_number += 1
            
            return steps
            
        except Exception as e:
            logger.error(f"Step parsing failed: {e}")
            return []
    
    def _extract_step_type(self, type_part: str) -> str:
        """Extract step type from text"""
        type_part_lower = type_part.lower()
        
        if 'premise' in type_part_lower:
            return 'premise'
        elif 'conclusion' in type_part_lower:
            return 'conclusion'
        else:
            return 'inference'
    
    async def _assess_logical_validity(
        self, 
        steps: List[ReasoningStep], 
        reasoning_type: ReasoningType
    ) -> float:
        """Assess the logical validity of reasoning chain"""
        try:
            if not steps:
                return 0.0
            
            # Simplified validity assessment
            # In production, this would use more sophisticated logic validation
            
            validity_score = 0.0
            
            # Check if there are premises and conclusions
            has_premise = any(step.type == 'premise' for step in steps)
            has_conclusion = any(step.type == 'conclusion' for step in steps)
            
            if has_premise and has_conclusion:
                validity_score += 0.5
            
            # Check step progression
            if len(steps) >= 2:
                validity_score += 0.3
            
            # Check confidence levels
            avg_confidence = sum(step.confidence for step in steps) / len(steps)
            validity_score += avg_confidence * 0.2
            
            return min(validity_score, 1.0)
            
        except Exception as e:
            logger.error(f"Validity assessment failed: {e}")
            return 0.0