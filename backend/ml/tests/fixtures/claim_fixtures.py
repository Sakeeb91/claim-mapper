"""
Fixtures for claim-related test data.
"""
import pytest
from typing import Dict, List, Any
from datetime import datetime, timedelta


@pytest.fixture
def basic_claim():
    """Basic claim for testing."""
    return {
        "id": "basic_001",
        "text": "Renewable energy is more cost-effective than fossil fuels",
        "type": "comparative",
        "confidence": 0.75,
        "created_at": datetime.now().isoformat(),
        "metadata": {
            "domain": "energy",
            "complexity": "medium"
        }
    }


@pytest.fixture
def complex_claim():
    """Complex claim with multiple components."""
    return {
        "id": "complex_001",
        "text": "The implementation of carbon pricing mechanisms, including carbon taxes and cap-and-trade systems, has demonstrated measurable reductions in greenhouse gas emissions across multiple jurisdictions while maintaining economic growth",
        "type": "causal",
        "confidence": 0.82,
        "components": [
            "carbon pricing mechanisms",
            "carbon taxes",
            "cap-and-trade systems",
            "greenhouse gas emissions",
            "economic growth"
        ],
        "relationships": [
            {
                "subject": "carbon pricing mechanisms",
                "predicate": "causes",
                "object": "emission reductions"
            }
        ],
        "evidence_requirements": [
            "emission data from jurisdictions with carbon pricing",
            "economic performance data",
            "comparative analysis"
        ],
        "created_at": datetime.now().isoformat(),
        "metadata": {
            "domain": "policy",
            "complexity": "high",
            "jurisdiction": "multiple"
        }
    }


@pytest.fixture
def health_claim():
    """Health-related claim for domain-specific testing."""
    return {
        "id": "health_001",
        "text": "Regular exercise reduces the risk of cardiovascular disease by 30%",
        "type": "statistical",
        "confidence": 0.88,
        "domain": "health",
        "statistical_info": {
            "metric": "risk reduction",
            "percentage": 30,
            "baseline": "sedentary lifestyle"
        },
        "created_at": datetime.now().isoformat(),
        "metadata": {
            "domain": "health",
            "study_type": "meta-analysis",
            "evidence_level": "high"
        }
    }


@pytest.fixture
def technology_claim():
    """Technology-related claim."""
    return {
        "id": "tech_001",
        "text": "Artificial intelligence will replace 40% of jobs within the next 20 years",
        "type": "predictive",
        "confidence": 0.65,
        "domain": "technology",
        "time_horizon": "20 years",
        "prediction_scope": "global workforce",
        "created_at": datetime.now().isoformat(),
        "metadata": {
            "domain": "technology",
            "prediction_type": "employment",
            "uncertainty": "high"
        }
    }


@pytest.fixture
def contradictory_claims():
    """Set of contradictory claims for testing conflict detection."""
    return [
        {
            "id": "contra_001",
            "text": "Nuclear energy is the safest form of electricity generation",
            "type": "comparative",
            "confidence": 0.7,
            "domain": "energy"
        },
        {
            "id": "contra_002", 
            "text": "Nuclear energy poses significant safety risks compared to renewable alternatives",
            "type": "comparative",
            "confidence": 0.75,
            "domain": "energy"
        }
    ]


@pytest.fixture
def claims_batch():
    """Batch of claims for bulk processing tests."""
    base_time = datetime.now()
    
    return [
        {
            "id": f"batch_{i:03d}",
            "text": f"Test claim number {i} about renewable energy benefits",
            "type": "factual",
            "confidence": 0.5 + (i * 0.1) % 0.5,
            "created_at": (base_time + timedelta(minutes=i)).isoformat(),
            "domain": "energy" if i % 2 == 0 else "environment",
            "metadata": {
                "batch_id": "test_batch_001",
                "order": i
            }
        }
        for i in range(10)
    ]


@pytest.fixture
def claim_with_evidence():
    """Claim with associated evidence."""
    return {
        "claim": {
            "id": "evidenced_001",
            "text": "Electric vehicles have lower lifetime emissions than gasoline vehicles",
            "type": "comparative",
            "confidence": 0.85,
            "domain": "transportation"
        },
        "evidence": [
            {
                "id": "ev_evidence_001",
                "text": "Life cycle analysis shows EVs produce 60% fewer emissions",
                "type": "quantitative",
                "source": "MIT Study 2023",
                "reliability": 0.9,
                "relevance": 0.95
            },
            {
                "id": "ev_evidence_002", 
                "text": "Battery production emissions are offset within 2 years of use",
                "type": "temporal",
                "source": "Nature Energy 2022",
                "reliability": 0.85,
                "relevance": 0.8
            },
            {
                "id": "ev_evidence_003",
                "text": "Grid decarbonization further improves EV emissions profile",
                "type": "conditional",
                "source": "IEA Report 2023",
                "reliability": 0.88,
                "relevance": 0.75
            }
        ]
    }


@pytest.fixture
def invalid_claims():
    """Collection of invalid claims for error handling tests."""
    return [
        {
            "id": "invalid_001",
            "text": "",  # Empty text
            "type": "factual",
            "confidence": 0.5
        },
        {
            "id": "invalid_002",
            "text": "Valid text",
            "type": "invalid_type",  # Invalid type
            "confidence": 0.5  
        },
        {
            "id": "invalid_003",
            "text": "Valid text",
            "type": "factual",
            "confidence": 1.5  # Invalid confidence score
        },
        {
            "id": "invalid_004",
            "text": "A" * 10000,  # Text too long
            "type": "factual",
            "confidence": 0.5
        }
    ]


@pytest.fixture
def multilingual_claims():
    """Claims in different languages for i18n testing."""
    return [
        {
            "id": "multi_en_001",
            "text": "Climate change is a global challenge requiring immediate action",
            "language": "en",
            "type": "normative",
            "confidence": 0.9
        },
        {
            "id": "multi_es_001", 
            "text": "El cambio climático es un desafío global que requiere acción inmediata",
            "language": "es",
            "type": "normative",
            "confidence": 0.9
        },
        {
            "id": "multi_fr_001",
            "text": "Le changement climatique est un défi mondial nécessitant une action immédiate",
            "language": "fr", 
            "type": "normative",
            "confidence": 0.9
        }
    ]


@pytest.fixture
def temporal_claims():
    """Claims with temporal aspects for time-based testing."""
    base_time = datetime.now()
    
    return [
        {
            "id": "temporal_past",
            "text": "Global CO2 levels were 315 ppm in 1958",
            "type": "historical",
            "time_reference": (base_time - timedelta(days=365*65)).isoformat(),
            "confidence": 0.98
        },
        {
            "id": "temporal_present",
            "text": "Current global CO2 levels exceed 420 ppm", 
            "type": "current",
            "time_reference": base_time.isoformat(),
            "confidence": 0.95
        },
        {
            "id": "temporal_future",
            "text": "CO2 levels will reach 450 ppm by 2040 under current trends",
            "type": "predictive",
            "time_reference": (base_time + timedelta(days=365*16)).isoformat(),
            "confidence": 0.7
        }
    ]


@pytest.fixture
def claim_relationships():
    """Relationships between claims for graph testing."""
    return {
        "claims": [
            {
                "id": "rel_001",
                "text": "Fossil fuel combustion releases CO2",
                "type": "causal"
            },
            {
                "id": "rel_002", 
                "text": "CO2 is a greenhouse gas",
                "type": "definitional"
            },
            {
                "id": "rel_003",
                "text": "Greenhouse gases cause global warming",
                "type": "causal"
            }
        ],
        "relationships": [
            {
                "source": "rel_001",
                "target": "rel_002", 
                "type": "supports",
                "strength": 0.9
            },
            {
                "source": "rel_002",
                "target": "rel_003",
                "type": "supports", 
                "strength": 0.85
            },
            {
                "source": "rel_001",
                "target": "rel_003",
                "type": "indirectly_supports",
                "strength": 0.7
            }
        ]
    }