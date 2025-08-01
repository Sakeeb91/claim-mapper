"""
Simple test script to verify ML services functionality
"""

import asyncio
import sys
import os

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.claim_extractor import ClaimExtractor
from services.argument_miner import ArgumentMiner
from services.semantic_analyzer import SemanticAnalyzer
from services.entity_extractor import EntityExtractor
from services.quality_scorer import QualityScorer
from models.schemas import ExtractedClaim, ClaimType


async def test_claim_extraction():
    """Test claim extraction functionality"""
    print("Testing Claim Extraction...")
    
    extractor = ClaimExtractor()
    await extractor._load_models()
    
    text = """
    Climate change is primarily caused by human activities. Studies show that greenhouse gas 
    emissions have increased significantly since the industrial revolution. This has led to 
    global temperature rise and environmental impacts.
    """
    
    try:
        result = await extractor.extract_claims(text, confidence_threshold=0.6)
        print(f"✓ Extracted {len(result.claims)} claims")
        for i, claim in enumerate(result.claims):
            print(f"  {i+1}. {claim.text} (confidence: {claim.confidence:.2f})")
    except Exception as e:
        print(f"✗ Claim extraction failed: {e}")


async def test_argument_mining():
    """Test argument mining functionality"""
    print("\nTesting Argument Mining...")
    
    miner = ArgumentMiner()
    await miner._load_models()
    
    text = """
    Solar energy is cost-effective because installation costs have decreased significantly. 
    According to recent studies, solar panel prices have dropped by 80% in the last decade. 
    Therefore, renewable energy adoption will increase substantially in the coming years.
    """
    
    try:
        result = await miner.extract_arguments(text, confidence_threshold=0.5)
        print(f"✓ Extracted {len(result['arguments'])} arguments and {len(result['relations'])} relations")
        for arg in result['arguments']:
            print(f"  - {arg['type']}: {arg['text'][:50]}...")
    except Exception as e:
        print(f"✗ Argument mining failed: {e}")


async def test_entity_extraction():
    """Test entity extraction functionality"""
    print("\nTesting Entity Extraction...")
    
    extractor = EntityExtractor()
    await extractor._load_models()
    
    text = """
    Dr. Sarah Johnson from Stanford University published groundbreaking research on artificial 
    intelligence in Nature journal in 2023. The study was conducted in collaboration with 
    researchers from MIT and focuses on machine learning applications in healthcare.
    """
    
    try:
        result = await extractor.extract_entities(text, confidence_threshold=0.7)
        print(f"✓ Extracted {len(result['entities'])} entities and {len(result['relationships'])} relationships")
        for entity in result['entities']:
            print(f"  - {entity['label']}: {entity['text']}")
    except Exception as e:
        print(f"✗ Entity extraction failed: {e}")


async def test_quality_scoring():
    """Test quality scoring functionality"""
    print("\nTesting Quality Scoring...")
    
    scorer = QualityScorer()
    await scorer._load_models()
    
    # Create a sample claim
    claim = ExtractedClaim(
        text="Research published in Nature shows that 97% of climate scientists agree on human-caused climate change.",
        type=ClaimType.ASSERTION,
        confidence=0.85,
        position={'start': 0, 'end': 100},
        keywords=['research', 'climate', 'scientists'],
        related_evidence=['NASA data', 'IPCC reports']
    )
    
    try:
        metrics = await scorer.assess_claim_quality(
            claim=claim,
            context="Scientific consensus study",
            evidence=['NASA temperature data', 'IPCC climate reports']
        )
        print(f"✓ Quality assessment completed")
        print(f"  - Overall Score: {metrics.overall_score:.2f}")
        print(f"  - Confidence: {metrics.confidence_score:.2f}")
        print(f"  - Clarity: {metrics.clarity_score:.2f}")
        print(f"  - Evidence: {metrics.evidence_score:.2f}")
        print(f"  - Issues: {len(metrics.issues)}")
    except Exception as e:
        print(f"✗ Quality scoring failed: {e}")


async def test_semantic_analysis():
    """Test semantic analysis functionality"""
    print("\nTesting Semantic Analysis...")
    
    analyzer = SemanticAnalyzer()
    await analyzer._load_models()
    
    # Create sample claims
    claims = [
        ExtractedClaim(
            text="Renewable energy is essential for sustainable development.",
            type=ClaimType.ASSERTION,
            confidence=0.8,
            position={'start': 0, 'end': 52},
            keywords=['renewable', 'energy', 'sustainable'],
            related_evidence=[]
        ),
        ExtractedClaim(
            text="Solar power costs have decreased significantly in recent years.",
            type=ClaimType.ASSERTION,
            confidence=0.85,
            position={'start': 0, 'end': 62},
            keywords=['solar', 'costs', 'decreased'],
            related_evidence=[]
        )
    ]
    
    try:
        result = await analyzer.analyze_claim_relationships(claims)
        print(f"✓ Semantic analysis completed")
        print(f"  - Relations: {len(result['relations'])}")
        print(f"  - Contradictions: {len(result['contradictions'])}")
        print(f"  - Clusters: {len(result['clusters'])}")
    except Exception as e:
        print(f"✗ Semantic analysis failed: {e}")


async def main():
    """Run all tests"""
    print("Running ML Service Tests\n" + "="*50)
    
    try:
        await test_claim_extraction()
        await test_argument_mining()
        await test_entity_extraction()
        await test_quality_scoring()
        await test_semantic_analysis()
        
        print("\n" + "="*50)
        print("All tests completed!")
        
    except KeyboardInterrupt:
        print("\nTests interrupted by user")
    except Exception as e:
        print(f"\nUnexpected error: {e}")


if __name__ == "__main__":
    asyncio.run(main())