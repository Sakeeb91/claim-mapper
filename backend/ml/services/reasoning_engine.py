"""
Advanced Reasoning Chain Generator with LLM integration and logical analysis
"""

import asyncio
import json
import re
import os
from typing import List, Dict, Optional, Set, Tuple, Union
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
from loguru import logger
from enum import Enum
import openai
import anthropic

from models.schemas import (
    ReasoningResponse, 
    ReasoningChain, 
    ReasoningStep, 
    ReasoningType
)

class LogicalFallacy(str, Enum):
    AD_HOMINEM = "ad_hominem"
    STRAW_MAN = "straw_man"
    FALSE_DICHOTOMY = "false_dichotomy"
    SLIPPERY_SLOPE = "slippery_slope"
    APPEAL_TO_AUTHORITY = "appeal_to_authority"
    CIRCULAR_REASONING = "circular_reasoning"
    HASTY_GENERALIZATION = "hasty_generalization"
    FALSE_CAUSE = "false_cause"
    APPEAL_TO_EMOTION = "appeal_to_emotion"
    BANDWAGON = "bandwagon"

class ReasoningComplexity(str, Enum):
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

class LogicalGap(str, Enum):
    MISSING_PREMISE = "missing_premise"
    INVALID_INFERENCE = "invalid_inference"
    WEAK_CONNECTION = "weak_connection"
    UNSUPPORTED_ASSUMPTION = "unsupported_assumption"
    CONTRADICTORY_EVIDENCE = "contradictory_evidence"

class ReasoningChainGenerator:
    """Advanced reasoning chain generator with multi-step logical progression analysis"""
    
    def __init__(self):
        self.generator = None
        self.tokenizer = None
        self.openai_client = None
        self.anthropic_client = None
        self.fallacy_patterns = self._load_fallacy_patterns()
        
        # Initialize models and LLM clients
        asyncio.create_task(self._load_models())
        asyncio.create_task(self._init_llm_clients())
    
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
            # Don't raise, allow fallback to LLM-only mode
    
    async def _init_llm_clients(self):
        """Initialize LLM clients for advanced reasoning"""
        try:
            # Initialize OpenAI client if API key is available
            if os.getenv("OPENAI_API_KEY"):
                openai.api_key = os.getenv("OPENAI_API_KEY")
                self.openai_client = openai
                logger.info("OpenAI client initialized")
            
            # Initialize Anthropic client if API key is available
            if os.getenv("ANTHROPIC_API_KEY"):
                self.anthropic_client = anthropic.Anthropic(
                    api_key=os.getenv("ANTHROPIC_API_KEY")
                )
                logger.info("Anthropic client initialized")
                
        except Exception as e:
            logger.warning(f"LLM client initialization failed: {e}")
    
    def _load_fallacy_patterns(self) -> Dict[LogicalFallacy, List[str]]:
        """Load patterns for logical fallacy detection"""
        return {
            LogicalFallacy.AD_HOMINEM: [
                r"\b(you|they)\s+(are|is)\s+(stupid|wrong|biased|incompetent)",
                r"\b(attack|dismiss|ignore)\s+the\s+(person|individual|source)"
            ],
            LogicalFallacy.STRAW_MAN: [
                r"\b(claims?|says?|argues?)\s+that\s+.{20,}\s+(but|however)\s+that\'s\s+not",
                r"\b(distort|misrepresent|exaggerate)\s+.{10,}\s+(position|argument)"
            ],
            LogicalFallacy.FALSE_DICHOTOMY: [
                r"\b(either|only|must)\s+.{10,}\s+(or|otherwise)",
                r"\b(no\s+other|only\s+two)\s+(option|choice|way)"
            ],
            LogicalFallacy.CIRCULAR_REASONING: [
                r"\bbecause\s+.{10,}\s+because\b",
                r"\b(prove|show|demonstrate)\s+.{10,}\s+by\s+assuming"
            ],
            LogicalFallacy.HASTY_GENERALIZATION: [
                r"\b(all|every|always|never)\s+.{10,}\s+(are|is|do|does)",
                r"\b(one|few|some)\s+.{10,}\s+(therefore|so)\s+(all|every)"
            ]
        }
    
    async def generate_reasoning_chain(
        self,
        claim: str,
        evidence: List[str],
        reasoning_type: ReasoningType = ReasoningType.DEDUCTIVE,
        complexity: ReasoningComplexity = ReasoningComplexity.INTERMEDIATE,
        max_steps: int = 7,
        use_llm: bool = True
    ) -> ReasoningResponse:
        """Generate comprehensive reasoning chains with advanced analysis"""
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Generate primary reasoning chain
            if use_llm and (self.openai_client or self.anthropic_client):
                chains = await self._generate_llm_reasoning(
                    claim, evidence, reasoning_type, complexity, max_steps
                )
            else:
                chains = await self._generate_fallback_reasoning(
                    claim, evidence, reasoning_type, max_steps
                )
            
            # Enhance chains with advanced analysis
            for chain in chains:
                # Detect logical fallacies
                chain.fallacies = await self._detect_fallacies(chain)
                
                # Identify logical gaps
                chain.logical_gaps = await self._identify_logical_gaps(chain, evidence)
                
                # Generate counterarguments
                chain.counterarguments = await self._generate_counterarguments(claim, chain)
                
                # Assess premise-conclusion strength
                chain.premise_strength = await self._assess_premise_strength(chain)
                
                # Identify evidence requirements
                chain.evidence_requirements = await self._identify_evidence_requirements(chain)
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            return ReasoningResponse(
                reasoning_chains=chains,
                processing_time=processing_time,
                model_version="reasoning-chain-generator-v2.0",
                metadata={
                    "claim": claim,
                    "evidence_count": len(evidence),
                    "reasoning_type": reasoning_type,
                    "complexity": complexity,
                    "llm_used": use_llm and (self.openai_client or self.anthropic_client) is not None
                }
            )
            
        except Exception as e:
            logger.error(f"Reasoning chain generation failed: {e}")
            raise
    
    async def _generate_llm_reasoning(
        self,
        claim: str,
        evidence: List[str],
        reasoning_type: ReasoningType,
        complexity: ReasoningComplexity,
        max_steps: int
    ) -> List[ReasoningChain]:
        """Generate reasoning using LLM with chain-of-thought prompting"""
        
        try:
            # Choose LLM client
            if self.anthropic_client:
                return await self._generate_anthropic_reasoning(
                    claim, evidence, reasoning_type, complexity, max_steps
                )
            elif self.openai_client:
                return await self._generate_openai_reasoning(
                    claim, evidence, reasoning_type, complexity, max_steps
                )
            else:
                return await self._generate_fallback_reasoning(
                    claim, evidence, reasoning_type, max_steps
                )
                
        except Exception as e:
            logger.error(f"LLM reasoning generation failed: {e}")
            return await self._generate_fallback_reasoning(
                claim, evidence, reasoning_type, max_steps
            )
    
    async def _generate_anthropic_reasoning(
        self,
        claim: str,
        evidence: List[str],
        reasoning_type: ReasoningType,
        complexity: ReasoningComplexity,
        max_steps: int
    ) -> List[ReasoningChain]:
        """Generate reasoning using Anthropic Claude"""
        
        prompt = self._build_advanced_prompt(
            claim, evidence, reasoning_type, complexity, max_steps
        )
        
        try:
            response = self.anthropic_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=2000,
                temperature=0.3,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            reasoning_text = response.content[0].text
            return await self._parse_structured_reasoning(reasoning_text, reasoning_type)
            
        except Exception as e:
            logger.error(f"Anthropic reasoning failed: {e}")
            return []
    
    async def _generate_openai_reasoning(
        self,
        claim: str,
        evidence: List[str],
        reasoning_type: ReasoningType,
        complexity: ReasoningComplexity,
        max_steps: int
    ) -> List[ReasoningChain]:
        """Generate reasoning using OpenAI GPT"""
        
        prompt = self._build_advanced_prompt(
            claim, evidence, reasoning_type, complexity, max_steps
        )
        
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert logician and critical thinking assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            reasoning_text = response.choices[0].message.content
            return await self._parse_structured_reasoning(reasoning_text, reasoning_type)
            
        except Exception as e:
            logger.error(f"OpenAI reasoning failed: {e}")
            return []
    
    def _build_advanced_prompt(
        self,
        claim: str,
        evidence: List[str],
        reasoning_type: ReasoningType,
        complexity: ReasoningComplexity,
        max_steps: int
    ) -> str:
        """Build advanced chain-of-thought reasoning prompt"""
        
        evidence_text = "\n".join([f"- {ev}" for ev in evidence]) if evidence else "No specific evidence provided"
        
        complexity_instructions = {
            ReasoningComplexity.BASIC: "Use simple, clear logical steps that are easy to follow.",
            ReasoningComplexity.INTERMEDIATE: "Include intermediate logical connections and consider alternative perspectives.",
            ReasoningComplexity.ADVANCED: "Analyze complex logical relationships, identify assumptions, and consider multiple reasoning paths.",
            ReasoningComplexity.EXPERT: "Provide sophisticated logical analysis with formal reasoning structures and comprehensive evaluation."
        }
        
        reasoning_instructions = {
            ReasoningType.DEDUCTIVE: "Use deductive reasoning: start with general premises and derive specific conclusions.",
            ReasoningType.INDUCTIVE: "Use inductive reasoning: analyze specific observations to form general conclusions.",
            ReasoningType.ABDUCTIVE: "Use abductive reasoning: find the best explanation for the given observations."
        }
        
        return f"""
Analyze the following claim using {reasoning_type.value} reasoning at {complexity.value} level:

CLAIM: {claim}

EVIDENCE:
{evidence_text}

INSTRUCTIONS:
{reasoning_instructions[reasoning_type]}
{complexity_instructions[complexity]}

Please provide a structured reasoning chain with the following format:

REASONING CHAIN:
Step 1: [PREMISE/INFERENCE/CONCLUSION] - [Explanation]
Step 2: [PREMISE/INFERENCE/CONCLUSION] - [Explanation]
...

ASSUMPTIONS:
- List any key assumptions made

POTENTIAL WEAKNESSES:
- Identify potential logical gaps or weak points

EVIDENCE REQUIREMENTS:
- What additional evidence would strengthen this reasoning?

COUNTERARGUMENTS:
- What are the strongest arguments against this reasoning?

Limit to {max_steps} main reasoning steps.
"""
    
    async def _parse_structured_reasoning(
        self, 
        reasoning_text: str, 
        reasoning_type: ReasoningType
    ) -> List[ReasoningChain]:
        """Parse structured reasoning response into ReasoningChain objects"""
        
        try:
            steps = []
            assumptions = []
            weaknesses = []
            evidence_requirements = []
            counterarguments = []
            
            # Parse reasoning steps
            step_pattern = r"Step\s+(\d+):\s*\[([^\]]+)\]\s*-\s*(.+)"
            step_matches = re.findall(step_pattern, reasoning_text, re.IGNORECASE | re.MULTILINE)
            
            for step_num, step_type, explanation in step_matches:
                step = ReasoningStep(
                    step_number=int(step_num),
                    text=explanation.strip(),
                    confidence=0.8,  # Default, could be enhanced with confidence detection
                    type=step_type.lower().replace(" ", "_"),
                    evidence_used=[]
                )
                steps.append(step)
            
            # Parse assumptions
            assumptions_section = re.search(r"ASSUMPTIONS:(.*?)(?=\n[A-Z]+:|$)", reasoning_text, re.DOTALL | re.IGNORECASE)
            if assumptions_section:
                assumption_lines = [line.strip('- ').strip() for line in assumptions_section.group(1).split('\n') if line.strip()]
                assumptions = [line for line in assumption_lines if line and not line.startswith('ASSUMPTIONS')]
            
            # Parse weaknesses
            weaknesses_section = re.search(r"POTENTIAL WEAKNESSES:(.*?)(?=\n[A-Z]+:|$)", reasoning_text, re.DOTALL | re.IGNORECASE)
            if weaknesses_section:
                weakness_lines = [line.strip('- ').strip() for line in weaknesses_section.group(1).split('\n') if line.strip()]
                weaknesses = [line for line in weakness_lines if line and not line.startswith('POTENTIAL')]
            
            # Parse evidence requirements
            evidence_section = re.search(r"EVIDENCE REQUIREMENTS:(.*?)(?=\n[A-Z]+:|$)", reasoning_text, re.DOTALL | re.IGNORECASE)
            if evidence_section:
                evidence_lines = [line.strip('- ').strip() for line in evidence_section.group(1).split('\n') if line.strip()]
                evidence_requirements = [line for line in evidence_lines if line and not line.startswith('EVIDENCE')]
            
            # Parse counterarguments
            counter_section = re.search(r"COUNTERARGUMENTS:(.*?)(?=\n[A-Z]+:|$)", reasoning_text, re.DOTALL | re.IGNORECASE)
            if counter_section:
                counter_lines = [line.strip('- ').strip() for line in counter_section.group(1).split('\n') if line.strip()]
                counterarguments = [line for line in counter_lines if line and not line.startswith('COUNTER')]
            
            # Calculate overall confidence and validity
            overall_confidence = sum(step.confidence for step in steps) / len(steps) if steps else 0.0
            logical_validity = await self._assess_logical_validity(steps, reasoning_type)
            
            chain = ReasoningChain(
                steps=steps,
                reasoning_type=reasoning_type,
                overall_confidence=overall_confidence,
                logical_validity=logical_validity
            )
            
            # Add enhanced attributes
            chain.assumptions = assumptions
            chain.weaknesses = weaknesses
            chain.evidence_requirements = evidence_requirements
            chain.counterarguments = counterarguments
            
            return [chain]
            
        except Exception as e:
            logger.error(f"Structured reasoning parsing failed: {e}")
            return []
    
    async def _detect_fallacies(self, chain: ReasoningChain) -> List[Dict[str, Union[str, float]]]:
        """Detect logical fallacies in reasoning chain"""
        
        fallacies_detected = []
        
        # Combine all step texts for analysis
        full_text = " ".join([step.text for step in chain.steps])
        
        for fallacy, patterns in self.fallacy_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, full_text, re.IGNORECASE)
                for match in matches:
                    fallacies_detected.append({
                        "type": fallacy.value,
                        "description": self._get_fallacy_description(fallacy),
                        "confidence": 0.7,
                        "location": match.span(),
                        "text_excerpt": match.group()
                    })
        
        return fallacies_detected
    
    def _get_fallacy_description(self, fallacy: LogicalFallacy) -> str:
        """Get description of logical fallacy"""
        descriptions = {
            LogicalFallacy.AD_HOMINEM: "Attacking the person making the argument rather than the argument itself",
            LogicalFallacy.STRAW_MAN: "Misrepresenting someone's argument to make it easier to attack",
            LogicalFallacy.FALSE_DICHOTOMY: "Presenting only two options when more exist",
            LogicalFallacy.CIRCULAR_REASONING: "Using the conclusion as part of the premise",
            LogicalFallacy.HASTY_GENERALIZATION: "Making broad generalizations from limited examples"
        }
        return descriptions.get(fallacy, "Unknown fallacy")
    
    async def _identify_logical_gaps(
        self, 
        chain: ReasoningChain, 
        evidence: List[str]
    ) -> List[Dict[str, Union[str, float]]]:
        """Identify logical gaps in reasoning chain"""
        
        gaps = []
        
        # Check for missing premises
        if not any(step.type == "premise" for step in chain.steps):
            gaps.append({
                "type": LogicalGap.MISSING_PREMISE.value,
                "description": "No clear premises identified in the reasoning chain",
                "severity": 0.8,
                "suggestion": "Identify and state the foundational assumptions"
            })
        
        # Check for weak connections between steps
        for i in range(len(chain.steps) - 1):
            current_step = chain.steps[i]
            next_step = chain.steps[i + 1]
            
            # Simple heuristic: check if steps are logically connected
            if not self._steps_logically_connected(current_step, next_step):
                gaps.append({
                    "type": LogicalGap.WEAK_CONNECTION.value,
                    "description": f"Weak logical connection between steps {i+1} and {i+2}",
                    "severity": 0.6,
                    "suggestion": "Provide clearer logical bridge between these steps"
                })
        
        # Check for unsupported assumptions
        for step in chain.steps:
            if step.type == "premise" and not step.evidence_used:
                gaps.append({
                    "type": LogicalGap.UNSUPPORTED_ASSUMPTION.value,
                    "description": f"Unsupported assumption in step {step.step_number}",
                    "severity": 0.7,
                    "suggestion": "Provide evidence or justification for this assumption"
                })
        
        return gaps
    
    def _steps_logically_connected(self, step1: ReasoningStep, step2: ReasoningStep) -> bool:
        """Check if two reasoning steps are logically connected"""
        # Simple heuristic: look for connecting words or shared concepts
        connecting_words = ["therefore", "thus", "hence", "because", "since", "given that", "it follows"]
        
        step2_lower = step2.text.lower()
        return any(word in step2_lower for word in connecting_words)
    
    async def _generate_counterarguments(
        self, 
        claim: str, 
        chain: ReasoningChain
    ) -> List[str]:
        """Generate counterarguments to the reasoning chain"""
        
        if not (self.openai_client or self.anthropic_client):
            return ["Counterargument generation requires LLM access"]
        
        try:
            prompt = f"""
Given the claim: "{claim}"

And the following reasoning chain:
{self._format_chain_for_prompt(chain)}

Generate 2-3 strong counterarguments that challenge this reasoning. Focus on:
1. Alternative explanations
2. Contradictory evidence
3. Logical weaknesses
4. Different interpretations

Format as a simple list of counterarguments.
"""
            
            if self.anthropic_client:
                response = self.anthropic_client.messages.create(
                    model="claude-3-sonnet-20240229",
                    max_tokens=800,
                    messages=[{"role": "user", "content": prompt}]
                )
                counterarguments_text = response.content[0].text
            else:
                response = await openai.ChatCompletion.acreate(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=800
                )
                counterarguments_text = response.choices[0].message.content
            
            # Parse counterarguments
            counterarguments = [
                line.strip('- ').strip() 
                for line in counterarguments_text.split('\n') 
                if line.strip() and line.strip().startswith(('-', '•', str))
            ]
            
            return counterarguments[:3]  # Limit to 3 counterarguments
            
        except Exception as e:
            logger.error(f"Counterargument generation failed: {e}")
            return []
    
    def _format_chain_for_prompt(self, chain: ReasoningChain) -> str:
        """Format reasoning chain for LLM prompt"""
        formatted_steps = []
        for step in chain.steps:
            formatted_steps.append(f"Step {step.step_number}: [{step.type}] {step.text}")
        return "\n".join(formatted_steps)
    
    async def _assess_premise_strength(self, chain: ReasoningChain) -> Dict[str, float]:
        """Assess the strength of premises in the reasoning chain"""
        
        premise_steps = [step for step in chain.steps if step.type == "premise"]
        
        if not premise_steps:
            return {"overall_strength": 0.0, "premise_count": 0}
        
        # Simple strength assessment based on confidence and evidence
        total_strength = 0.0
        for step in premise_steps:
            strength = step.confidence
            if step.evidence_used:
                strength += 0.2  # Bonus for evidence-backed premises
            total_strength += min(strength, 1.0)
        
        average_strength = total_strength / len(premise_steps)
        
        return {
            "overall_strength": average_strength,
            "premise_count": len(premise_steps),
            "individual_strengths": [
                {"step": step.step_number, "strength": step.confidence}
                for step in premise_steps
            ]
        }
    
    async def _identify_evidence_requirements(self, chain: ReasoningChain) -> List[str]:
        """Identify what evidence would strengthen the reasoning chain"""
        
        requirements = []
        
        # Check for unsupported premises
        for step in chain.steps:
            if step.type == "premise" and not step.evidence_used:
                requirements.append(f"Evidence to support: {step.text[:50]}...")
        
        # Check for weak inferences
        weak_steps = [step for step in chain.steps if step.confidence < 0.6]
        for step in weak_steps:
            requirements.append(f"Additional support needed for: {step.text[:50]}...")
        
        # Generic requirements based on reasoning type
        if chain.reasoning_type == ReasoningType.INDUCTIVE:
            requirements.append("More examples or cases to strengthen generalization")
        elif chain.reasoning_type == ReasoningType.ABDUCTIVE:
            requirements.append("Evidence ruling out alternative explanations")
        
        return requirements[:5]  # Limit to 5 requirements
    
    # Legacy method for backward compatibility
    async def generate_reasoning(
        self,
        claim: str,
        evidence: List[str],
        reasoning_type: ReasoningType = ReasoningType.DEDUCTIVE,
        max_steps: int = 5
    ) -> ReasoningResponse:
        """Legacy method for backward compatibility"""
        return await self.generate_reasoning_chain(
            claim=claim,
            evidence=evidence,
            reasoning_type=reasoning_type,
            complexity=ReasoningComplexity.INTERMEDIATE,
            max_steps=max_steps,
            use_llm=True
        )
    
    # Fallback methods for when LLM is not available
    async def _generate_fallback_reasoning(
        self,
        claim: str,
        evidence: List[str],
        reasoning_type: ReasoningType,
        max_steps: int
    ) -> List[ReasoningChain]:
        """Generate reasoning using fallback transformer model"""
        try:
            if reasoning_type == ReasoningType.DEDUCTIVE:
                chains = await self._generate_deductive_reasoning(claim, evidence, max_steps)
            elif reasoning_type == ReasoningType.INDUCTIVE:
                chains = await self._generate_inductive_reasoning(claim, evidence, max_steps)
            else:  # ABDUCTIVE
                chains = await self._generate_abductive_reasoning(claim, evidence, max_steps)
            
            return chains
            
        except Exception as e:
            logger.error(f"Fallback reasoning generation failed: {e}")
            return []

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


# Maintain backward compatibility
class ReasoningEngine(ReasoningChainGenerator):
    """Backward compatibility alias"""
    pass