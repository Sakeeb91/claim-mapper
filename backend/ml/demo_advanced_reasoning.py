"""
Demonstration of Advanced Reasoning Chain Generation capabilities
"""

import asyncio
import json
from services.reasoning_engine import ReasoningChainGenerator, ReasoningComplexity
from models.schemas import ReasoningType


async def demo_basic_reasoning():
    """Demonstrate basic reasoning chain generation"""
    print("🧠 Basic Reasoning Chain Generation Demo")
    print("-" * 50)
    
    generator = ReasoningChainGenerator()
    
    # Wait for models to load
    await asyncio.sleep(1)
    
    claim = "Artificial intelligence will revolutionize education"
    evidence = [
        "AI can personalize learning experiences for individual students",
        "Automated grading systems save teachers significant time",
        "AI tutoring systems provide 24/7 support to students",
        "Adaptive learning platforms adjust difficulty based on student performance"
    ]
    
    print(f"Claim: {claim}")
    print(f"Evidence: {len(evidence)} pieces")
    for i, ev in enumerate(evidence, 1):
        print(f"  {i}. {ev}")
    
    try:
        result = await generator.generate_reasoning_chain(
            claim=claim,
            evidence=evidence,
            reasoning_type=ReasoningType.INDUCTIVE,
            complexity=ReasoningComplexity.INTERMEDIATE,
            max_steps=6,
            use_llm=False  # Use fallback for demo
        )
        
        if result.reasoning_chains:
            chain = result.reasoning_chains[0]
            print(f"\n📊 Generated Reasoning Chain:")
            print(f"Type: {chain.reasoning_type}")
            print(f"Confidence: {chain.overall_confidence:.2f}")
            print(f"Logical Validity: {chain.logical_validity:.2f}")
            print(f"Steps: {len(chain.steps)}")
            
            print(f"\n🔗 Reasoning Steps:")
            for step in chain.steps:
                print(f"  {step.step_number}. [{step.type.upper()}] {step.text}")
                print(f"      Confidence: {step.confidence:.2f}")
            
            # Show enhanced attributes if available
            if hasattr(chain, 'fallacies') and chain.fallacies:
                print(f"\n⚠️  Logical Fallacies Detected: {len(chain.fallacies)}")
                for fallacy in chain.fallacies:
                    print(f"  - {fallacy['type']}: {fallacy['description']}")
            
            if hasattr(chain, 'logical_gaps') and chain.logical_gaps:
                print(f"\n🔍 Logical Gaps Identified: {len(chain.logical_gaps)}")
                for gap in chain.logical_gaps:
                    severity = gap.get('severity', 0)
                    print(f"  - {gap['type']} (severity: {severity:.1f}): {gap['description']}")
            
            if hasattr(chain, 'evidence_requirements') and chain.evidence_requirements:
                print(f"\n📋 Evidence Requirements: {len(chain.evidence_requirements)}")
                for req in chain.evidence_requirements:
                    print(f"  - {req}")
        
        print(f"\n⏱️  Processing Time: {result.processing_time:.3f} seconds")
        
    except Exception as e:
        print(f"❌ Error: {e}")


async def demo_fallacy_detection():
    """Demonstrate logical fallacy detection"""
    print("\n\n🚨 Logical Fallacy Detection Demo")
    print("-" * 50)
    
    generator = ReasoningChainGenerator()
    
    # Create reasoning with intentional fallacies
    from models.schemas import ReasoningStep, ReasoningChain
    
    steps_with_fallacies = [
        ReasoningStep(
            step_number=1,
            text="Climate scientists are just trying to get more funding, so they're biased",
            confidence=0.6,
            type="premise",
            evidence_used=[]
        ),
        ReasoningStep(
            step_number=2,
            text="Either we stop all industrial activity or the planet will die",
            confidence=0.7,
            type="inference",
            evidence_used=[]
        ),
        ReasoningStep(
            step_number=3,
            text="Everyone knows climate change is a hoax",
            confidence=0.5,
            type="conclusion",
            evidence_used=[]
        )
    ]
    
    fallacious_chain = ReasoningChain(
        steps=steps_with_fallacies,
        reasoning_type=ReasoningType.DEDUCTIVE,
        overall_confidence=0.6,
        logical_validity=0.3
    )
    
    print("Analyzing reasoning chain for logical fallacies...")
    print("\nReasoning Steps:")
    for step in steps_with_fallacies:
        print(f"  {step.step_number}. {step.text}")
    
    try:
        fallacies = await generator._detect_fallacies(fallacious_chain)
        
        if fallacies:
            print(f"\n🚨 Detected {len(fallacies)} potential logical fallacies:")
            for fallacy in fallacies:
                print(f"  - {fallacy['type'].replace('_', ' ').title()}")
                print(f"    Description: {fallacy['description']}")
                print(f"    Confidence: {fallacy['confidence']:.2f}")
                if 'text_excerpt' in fallacy:
                    print(f"    Text: \"{fallacy['text_excerpt']}\"")
                print()
        else:
            print("✅ No logical fallacies detected in this reasoning chain.")
            
    except Exception as e:
        print(f"❌ Error in fallacy detection: {e}")


async def demo_gap_analysis():
    """Demonstrate logical gap identification"""
    print("\n\n🔍 Logical Gap Analysis Demo")
    print("-" * 50)
    
    generator = ReasoningChainGenerator()
    
    # Create reasoning with logical gaps
    from models.schemas import ReasoningStep, ReasoningChain
    
    gappy_steps = [
        ReasoningStep(
            step_number=1,
            text="Many successful people wake up early",
            confidence=0.8,
            type="premise",
            evidence_used=[]
        ),
        ReasoningStep(
            step_number=2,
            text="Therefore, waking up early causes success",
            confidence=0.4,  # Low confidence indicates weak inference
            type="conclusion",
            evidence_used=[]
        )
    ]
    
    gappy_chain = ReasoningChain(
        steps=gappy_steps,
        reasoning_type=ReasoningType.DEDUCTIVE,
        overall_confidence=0.6,
        logical_validity=0.4
    )
    
    print("Analyzing reasoning chain for logical gaps...")
    print("\nReasoning Steps:")
    for step in gappy_steps:
        print(f"  {step.step_number}. [{step.type}] {step.text} (confidence: {step.confidence:.2f})")
    
    try:
        gaps = await generator._identify_logical_gaps(gappy_chain, [])
        
        if gaps:
            print(f"\n🔍 Identified {len(gaps)} logical gaps:")
            for gap in gaps:
                severity = gap.get('severity', 0)
                print(f"  - {gap['type'].replace('_', ' ').title()} (severity: {severity:.1f})")
                print(f"    Description: {gap['description']}")
                print(f"    Suggestion: {gap['suggestion']}")
                print()
        else:
            print("✅ No significant logical gaps detected.")
            
    except Exception as e:
        print(f"❌ Error in gap analysis: {e}")


async def demo_premise_strength():
    """Demonstrate premise strength assessment"""
    print("\n\n💪 Premise Strength Assessment Demo")
    print("-" * 50)
    
    generator = ReasoningChainGenerator()
    
    from models.schemas import ReasoningStep, ReasoningChain
    
    mixed_strength_steps = [
        ReasoningStep(
            step_number=1,
            text="Water boils at 100°C at sea level atmospheric pressure",
            confidence=0.98,
            type="premise",
            evidence_used=["Scientific measurement", "Consistent experimental results"]
        ),
        ReasoningStep(
            step_number=2,
            text="I heard from someone that altitude affects boiling point",
            confidence=0.3,
            type="premise",
            evidence_used=[]
        ),
        ReasoningStep(
            step_number=3,
            text="Therefore, water's boiling point varies with atmospheric conditions",
            confidence=0.8,
            type="conclusion",
            evidence_used=[]
        )
    ]
    
    strength_chain = ReasoningChain(
        steps=mixed_strength_steps,
        reasoning_type=ReasoningType.DEDUCTIVE,
        overall_confidence=0.7,
        logical_validity=0.75
    )
    
    print("Assessing premise strength...")
    print("\nReasoning Steps:")
    for step in mixed_strength_steps:
        evidence_count = len(step.evidence_used)
        print(f"  {step.step_number}. [{step.type}] {step.text}")
        print(f"      Confidence: {step.confidence:.2f}, Evidence: {evidence_count} pieces")
    
    try:
        strength_assessment = await generator._assess_premise_strength(strength_chain)
        
        print(f"\n💪 Premise Strength Assessment:")
        print(f"Overall Strength: {strength_assessment['overall_strength']:.2f}")
        print(f"Number of Premises: {strength_assessment['premise_count']}")
        
        if 'individual_strengths' in strength_assessment:
            print(f"\nIndividual Premise Strengths:")
            for item in strength_assessment['individual_strengths']:
                print(f"  Step {item['step']}: {item['strength']:.2f}")
                
    except Exception as e:
        print(f"❌ Error in premise strength assessment: {e}")


async def demo_evidence_requirements():
    """Demonstrate evidence requirement identification"""
    print("\n\n📋 Evidence Requirements Demo")
    print("-" * 50)
    
    generator = ReasoningChainGenerator()
    
    from models.schemas import ReasoningStep, ReasoningChain
    
    evidence_poor_steps = [
        ReasoningStep(
            step_number=1,
            text="Social media usage has increased dramatically",
            confidence=0.7,
            type="premise",
            evidence_used=[]
        ),
        ReasoningStep(
            step_number=2,
            text="Mental health issues among teenagers have also increased",
            confidence=0.6,
            type="premise",
            evidence_used=[]
        ),
        ReasoningStep(
            step_number=3,
            text="Therefore, social media directly causes mental health problems",
            confidence=0.4,  # Low confidence due to correlation vs causation
            type="conclusion",
            evidence_used=[]
        )
    ]
    
    evidence_chain = ReasoningChain(
        steps=evidence_poor_steps,
        reasoning_type=ReasoningType.INDUCTIVE,
        overall_confidence=0.5,
        logical_validity=0.4
    )
    
    print("Identifying evidence requirements...")
    print("\nReasoning Steps:")
    for step in evidence_poor_steps:
        print(f"  {step.step_number}. [{step.type}] {step.text}")
        print(f"      Confidence: {step.confidence:.2f}")
    
    try:
        requirements = await generator._identify_evidence_requirements(evidence_chain)
        
        if requirements:
            print(f"\n📋 Evidence Requirements ({len(requirements)} identified):")
            for i, req in enumerate(requirements, 1):
                print(f"  {i}. {req}")
        else:
            print("✅ No additional evidence requirements identified.")
            
    except Exception as e:
        print(f"❌ Error in evidence requirements identification: {e}")


async def main():
    """Run all demonstrations"""
    print("🎯 Advanced Reasoning Chain Generation Demonstration")
    print("=" * 60)
    
    demos = [
        demo_basic_reasoning,
        demo_fallacy_detection,
        demo_gap_analysis,
        demo_premise_strength,
        demo_evidence_requirements
    ]
    
    for demo in demos:
        try:
            await demo()
        except Exception as e:
            print(f"❌ Demo {demo.__name__} failed: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 Demonstration completed!")
    print("\nKey Features Demonstrated:")
    print("✅ Multi-step logical reasoning generation")
    print("✅ Logical fallacy detection")
    print("✅ Logical gap identification")
    print("✅ Premise strength assessment")
    print("✅ Evidence requirement identification")
    print("✅ Multiple reasoning types (deductive, inductive, abductive)")
    print("✅ Configurable complexity levels")
    print("✅ LLM integration support (with fallback)")


if __name__ == "__main__":
    asyncio.run(main())