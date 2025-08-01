"""
Test script for advanced reasoning chain generation capabilities
"""

import asyncio
import pytest
from services.reasoning_engine import ReasoningChainGenerator, ReasoningComplexity
from models.schemas import ReasoningType


async def test_basic_reasoning_generation():
    """Test basic reasoning chain generation"""
    generator = ReasoningChainGenerator()
    
    # Wait for models to load
    await asyncio.sleep(2)
    
    claim = "Renewable energy is essential for combating climate change"
    evidence = [
        "Fossil fuels are the primary source of greenhouse gas emissions",
        "Renewable energy sources produce minimal emissions",
        "Climate change poses significant risks to human civilization"
    ]
    
    try:
        result = await generator.generate_reasoning_chain(
            claim=claim,
            evidence=evidence,
            reasoning_type=ReasoningType.DEDUCTIVE,
            complexity=ReasoningComplexity.INTERMEDIATE,
            max_steps=5,
            use_llm=False  # Use fallback for testing
        )
        
        print("✓ Basic reasoning generation test passed")
        print(f"Generated {len(result.reasoning_chains)} reasoning chain(s)")
        
        if result.reasoning_chains:
            chain = result.reasoning_chains[0]
            print(f"Chain has {len(chain.steps)} steps")
            print(f"Overall confidence: {chain.overall_confidence:.2f}")
            print(f"Logical validity: {chain.logical_validity:.2f}")
            
            # Print reasoning steps
            for step in chain.steps:
                print(f"  Step {step.step_number}: [{step.type}] {step.text}")
        
        return True
        
    except Exception as e:
        print(f"✗ Basic reasoning generation test failed: {e}")
        return False


async def test_fallacy_detection():
    """Test logical fallacy detection"""
    generator = ReasoningChainGenerator()
    
    # Create a chain with potential fallacies
    from models.schemas import ReasoningStep, ReasoningChain
    
    steps = [
        ReasoningStep(
            step_number=1,
            text="You are wrong because you're clearly biased and incompetent",
            confidence=0.8,
            type="premise",
            evidence_used=[]
        ),
        ReasoningStep(
            step_number=2,
            text="Either we ban all cars or the planet will die",
            confidence=0.7,
            type="inference",
            evidence_used=[]
        ),
        ReasoningStep(
            step_number=3,
            text="This is true because I said it's true",
            confidence=0.6,
            type="conclusion",
            evidence_used=[]
        )
    ]
    
    chain = ReasoningChain(
        steps=steps,
        reasoning_type=ReasoningType.DEDUCTIVE,
        overall_confidence=0.7,
        logical_validity=0.5
    )
    
    try:
        fallacies = await generator._detect_fallacies(chain)
        
        print("✓ Fallacy detection test passed")
        print(f"Detected {len(fallacies)} potential fallacies:")
        
        for fallacy in fallacies:
            print(f"  - {fallacy['type']}: {fallacy['description']}")
        
        return True
        
    except Exception as e:
        print(f"✗ Fallacy detection test failed: {e}")
        return False


async def test_logical_gap_identification():
    """Test logical gap identification"""
    generator = ReasoningChainGenerator()
    
    # Create a chain with logical gaps
    from models.schemas import ReasoningStep, ReasoningChain
    
    steps = [
        ReasoningStep(
            step_number=1,
            text="The sky is blue",
            confidence=0.9,
            type="premise",
            evidence_used=[]
        ),
        ReasoningStep(
            step_number=2,
            text="Therefore, all birds can fly",
            confidence=0.3,  # Low confidence indicates weak inference
            type="conclusion",
            evidence_used=[]
        )
    ]
    
    chain = ReasoningChain(
        steps=steps,
        reasoning_type=ReasoningType.DEDUCTIVE,
        overall_confidence=0.6,
        logical_validity=0.4
    )
    
    try:
        gaps = await generator._identify_logical_gaps(chain, [])
        
        print("✓ Logical gap identification test passed")
        print(f"Identified {len(gaps)} logical gaps:")
        
        for gap in gaps:
            print(f"  - {gap['type']}: {gap['description']} (severity: {gap.get('severity', 'N/A')})")
        
        return True
        
    except Exception as e:
        print(f"✗ Logical gap identification test failed: {e}")
        return False


async def test_premise_strength_assessment():
    """Test premise strength assessment"""
    generator = ReasoningChainGenerator()
    
    from models.schemas import ReasoningStep, ReasoningChain
    
    steps = [
        ReasoningStep(
            step_number=1,
            text="Water boils at 100°C at sea level",
            confidence=0.95,
            type="premise",
            evidence_used=["Scientific measurement", "Consistent observations"]
        ),
        ReasoningStep(
            step_number=2,
            text="I think cats are better than dogs",
            confidence=0.4,
            type="premise",
            evidence_used=[]
        ),
        ReasoningStep(
            step_number=3,
            text="Therefore, scientific facts are more reliable than opinions",
            confidence=0.8,
            type="conclusion",
            evidence_used=[]
        )
    ]
    
    chain = ReasoningChain(
        steps=steps,
        reasoning_type=ReasoningType.DEDUCTIVE,
        overall_confidence=0.7,
        logical_validity=0.8
    )
    
    try:
        strength_assessment = await generator._assess_premise_strength(chain)
        
        print("✓ Premise strength assessment test passed")
        print(f"Overall premise strength: {strength_assessment['overall_strength']:.2f}")
        print(f"Number of premises: {strength_assessment['premise_count']}")
        
        if 'individual_strengths' in strength_assessment:
            print("Individual premise strengths:")
            for item in strength_assessment['individual_strengths']:
                print(f"  Step {item['step']}: {item['strength']:.2f}")
        
        return True
        
    except Exception as e:
        print(f"✗ Premise strength assessment test failed: {e}")
        return False


async def test_evidence_requirements():
    """Test evidence requirement identification"""
    generator = ReasoningChainGenerator()
    
    from models.schemas import ReasoningStep, ReasoningChain
    
    steps = [
        ReasoningStep(
            step_number=1,
            text="Artificial intelligence will revolutionize healthcare",
            confidence=0.6,
            type="premise",
            evidence_used=[]  # No evidence provided
        ),
        ReasoningStep(
            step_number=2,
            text="AI can diagnose diseases better than humans",
            confidence=0.5,  # Low confidence
            type="inference",
            evidence_used=[]
        ),
        ReasoningStep(
            step_number=3,
            text="Therefore, doctors will become obsolete",
            confidence=0.3,  # Very low confidence
            type="conclusion",
            evidence_used=[]
        )
    ]
    
    chain = ReasoningChain(
        steps=steps,
        reasoning_type=ReasoningType.INDUCTIVE,
        overall_confidence=0.5,
        logical_validity=0.4
    )
    
    try:
        requirements = await generator._identify_evidence_requirements(chain)
        
        print("✓ Evidence requirements identification test passed")
        print(f"Identified {len(requirements)} evidence requirements:")
        
        for req in requirements:
            print(f"  - {req}")
        
        return True
        
    except Exception as e:
        print(f"✗ Evidence requirements identification test failed: {e}")
        return False


async def run_all_tests():
    """Run all tests"""
    print("Running Advanced Reasoning Chain Generator Tests")
    print("=" * 50)
    
    tests = [
        test_basic_reasoning_generation,
        test_fallacy_detection,
        test_logical_gap_identification,
        test_premise_strength_assessment,
        test_evidence_requirements
    ]
    
    results = []
    for test in tests:
        print(f"\nRunning {test.__name__}...")
        try:
            result = await test()
            results.append(result)
        except Exception as e:
            print(f"✗ {test.__name__} failed with exception: {e}")
            results.append(False)
    
    print("\n" + "=" * 50)
    print("Test Results Summary:")
    print(f"Passed: {sum(results)}/{len(results)}")
    print(f"Failed: {len(results) - sum(results)}/{len(results)}")
    
    if all(results):
        print("🎉 All tests passed!")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")


if __name__ == "__main__":
    asyncio.run(run_all_tests())