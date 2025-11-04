"""
Fixtures for ML model testing.
"""
import pytest
import numpy as np
from unittest.mock import MagicMock, AsyncMock
from typing import Dict, List, Any

# Try to import torch, but don't fail if it's not available (CI environment)
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    # Create a mock torch module for type hints
    torch = MagicMock()


@pytest.fixture
def mock_embeddings():
    """Mock embeddings for testing."""
    return {
        "sentence_1": np.random.rand(384),
        "sentence_2": np.random.rand(384),
        "sentence_3": np.random.rand(384),
    }


@pytest.fixture
def mock_classification_results():
    """Mock classification results."""
    return [
        {
            "text": "This is a factual claim",
            "label": "factual",
            "confidence": 0.92,
            "probabilities": {
                "factual": 0.92,
                "opinion": 0.05,
                "prediction": 0.03
            }
        },
        {
            "text": "I believe this will happen",
            "label": "opinion", 
            "confidence": 0.78,
            "probabilities": {
                "factual": 0.15,
                "opinion": 0.78,
                "prediction": 0.07
            }
        }
    ]


@pytest.fixture
def mock_quality_scores():
    """Mock quality assessment scores."""
    return {
        "overall_score": 0.82,
        "clarity_score": 0.85,
        "specificity_score": 0.80,
        "evidence_score": 0.75,
        "bias_score": 0.90,
        "factuality_score": 0.85,
        "completeness_score": 0.70,
        "issues": [
            {
                "type": "clarity",
                "description": "Consider defining technical terms",
                "severity": "low",
                "suggestion": "Add definitions for domain-specific terms"
            }
        ],
        "recommendations": [
            "Provide additional supporting evidence",
            "Consider alternative perspectives",
            "Clarify causal relationships"
        ]
    }


@pytest.fixture
def mock_reasoning_chain():
    """Mock reasoning chain generation."""
    return {
        "type": "deductive",
        "steps": [
            {
                "step_number": 1,
                "type": "premise",
                "content": "All renewable energy sources reduce carbon emissions",
                "confidence": 0.9,
                "evidence_support": 0.85
            },
            {
                "step_number": 2,
                "type": "premise", 
                "content": "Solar energy is a renewable energy source",
                "confidence": 0.95,
                "evidence_support": 0.98
            },
            {
                "step_number": 3,
                "type": "conclusion",
                "content": "Therefore, solar energy reduces carbon emissions",
                "confidence": 0.87,
                "logical_validity": 0.95
            }
        ],
        "overall_validity": 0.91,
        "reasoning_strength": 0.88,
        "assumptions": [
            "Carbon emission reduction is measurable",
            "Solar energy classification is accurate"
        ],
        "potential_counterarguments": [
            "Manufacturing emissions from solar panels",
            "Energy storage requirements"
        ]
    }


@pytest.fixture  
def mock_entity_extraction():
    """Mock named entity extraction results."""
    return {
        "entities": [
            {
                "text": "Paris Agreement",
                "label": "TREATY",
                "start": 45,
                "end": 59,
                "confidence": 0.95
            },
            {
                "text": "2015",
                "label": "DATE", 
                "start": 63,
                "end": 67,
                "confidence": 0.98
            },
            {
                "text": "United Nations",
                "label": "ORG",
                "start": 75,
                "end": 89,
                "confidence": 0.96
            }
        ],
        "relations": [
            {
                "subject": "Paris Agreement",
                "predicate": "signed_in",
                "object": "2015",
                "confidence": 0.92
            },
            {
                "subject": "Paris Agreement", 
                "predicate": "organized_by",
                "object": "United Nations",
                "confidence": 0.88
            }
        ]
    }


@pytest.fixture
def mock_semantic_similarity():
    """Mock semantic similarity results."""
    return {
        "similarity_matrix": np.array([
            [1.0, 0.85, 0.45],
            [0.85, 1.0, 0.52], 
            [0.45, 0.52, 1.0]
        ]),
        "similar_pairs": [
            {
                "text_1": "Climate change causes sea level rise",
                "text_2": "Global warming leads to ocean level increase", 
                "similarity": 0.85,
                "semantic_overlap": ["climate", "change", "sea", "level", "rise"]
            }
        ],
        "clusters": [
            {
                "cluster_id": 0,
                "texts": [
                    "Climate change causes sea level rise",
                    "Global warming leads to ocean level increase"
                ],
                "centroid": np.random.rand(384),
                "coherence": 0.78
            }
        ]
    }


@pytest.fixture
def mock_bias_detection():
    """Mock bias detection results."""
    return {
        "overall_bias_score": 0.25,  # Lower is less biased
        "bias_types": {
            "political": 0.15,
            "cultural": 0.20,
            "confirmation": 0.35,
            "selection": 0.30
        },
        "detected_biases": [
            {
                "type": "confirmation_bias",
                "description": "Selective presentation of supporting evidence",
                "severity": "medium",
                "indicators": [
                    "One-sided evidence selection",
                    "Lack of counterarguments"
                ],
                "suggestions": [
                    "Include opposing viewpoints",
                    "Acknowledge limitations"
                ]
            }
        ],
        "neutrality_score": 0.75,
        "objectivity_indicators": {
            "use_of_qualifiers": 0.8,
            "balanced_language": 0.7,
            "source_diversity": 0.6
        }
    }


@pytest.fixture
def mock_fact_checking():
    """Mock fact-checking results."""
    return {
        "overall_factuality": 0.82,
        "checkable_claims": [
            {
                "claim": "Global temperature has risen 1.1°C since 1880",
                "verdict": "accurate",
                "confidence": 0.95,
                "sources": [
                    {
                        "name": "NASA GISS",
                        "url": "https://climate.nasa.gov/evidence/",
                        "reliability": 0.98
                    }
                ]
            },
            {
                "claim": "CO2 levels are highest in 3 million years",
                "verdict": "mostly_accurate", 
                "confidence": 0.88,
                "notes": "Timeframe may vary by measurement method",
                "sources": [
                    {
                        "name": "NOAA",
                        "url": "https://www.climate.gov/news-features/understanding-climate/climate-change-atmospheric-carbon-dioxide",
                        "reliability": 0.96
                    }
                ]
            }
        ],
        "unverifiable_claims": [
            {
                "claim": "Future technology will solve climate change",
                "reason": "speculative_prediction",
                "confidence": 0.3
            }
        ]
    }


@pytest.fixture
def mock_argument_mining():
    """Mock argument mining results."""
    return {
        "argument_components": [
            {
                "type": "claim",
                "text": "Renewable energy is more cost-effective than fossil fuels",
                "start": 0,
                "end": 56,
                "confidence": 0.92
            },
            {
                "type": "premise",
                "text": "Solar costs have dropped 80% in the last decade",
                "start": 58,
                "end": 106,
                "confidence": 0.88,
                "supports": ["claim"]
            },
            {
                "type": "premise", 
                "text": "Wind energy is now cheaper than coal in many regions",
                "start": 108,
                "end": 161,
                "confidence": 0.85,
                "supports": ["claim"]
            }
        ],
        "argument_structure": {
            "main_claim": "Renewable energy is more cost-effective than fossil fuels",
            "supporting_premises": [
                "Solar costs have dropped 80% in the last decade",
                "Wind energy is now cheaper than coal in many regions"
            ],
            "argument_scheme": "argument_from_example",
            "strength": 0.84
        },
        "counterarguments": [
            {
                "claim": "Initial installation costs are high",
                "type": "cost_objection",
                "strength": 0.65
            }
        ]
    }


@pytest.fixture
def mock_topic_modeling():
    """Mock topic modeling results."""
    return {
        "topics": [
            {
                "topic_id": 0,
                "label": "renewable_energy_costs",
                "words": [
                    ("cost", 0.15),
                    ("renewable", 0.12),
                    ("energy", 0.11),
                    ("solar", 0.08),
                    ("wind", 0.07)
                ],
                "coherence": 0.78,
                "documents": ["doc_1", "doc_3", "doc_7"]
            },
            {
                "topic_id": 1,
                "label": "climate_impacts",
                "words": [
                    ("climate", 0.18),
                    ("temperature", 0.14),
                    ("warming", 0.12),
                    ("impact", 0.09),
                    ("ecosystem", 0.08)
                ],
                "coherence": 0.82,
                "documents": ["doc_2", "doc_4", "doc_6"]
            }
        ],
        "topic_distribution": {
            "doc_1": [(0, 0.8), (1, 0.2)],
            "doc_2": [(0, 0.1), (1, 0.9)],
            "doc_3": [(0, 0.7), (1, 0.3)]
        }
    }


@pytest.fixture
def mock_model_performance():
    """Mock model performance metrics."""
    return {
        "accuracy": 0.87,
        "precision": 0.84,
        "recall": 0.89,
        "f1_score": 0.86,
        "confusion_matrix": [
            [45, 3, 2],
            [4, 38, 1], 
            [2, 2, 46]
        ],
        "classification_report": {
            "factual": {
                "precision": 0.90,
                "recall": 0.90,
                "f1-score": 0.90,
                "support": 50
            },
            "opinion": {
                "precision": 0.88,
                "recall": 0.88,
                "f1-score": 0.88,
                "support": 43
            },
            "prediction": {
                "precision": 0.94,
                "recall": 0.92,
                "f1-score": 0.93,
                "support": 50
            }
        },
        "cross_validation_scores": [0.85, 0.88, 0.86, 0.89, 0.87],
        "training_time": 145.7,
        "inference_time": 0.023
    }


@pytest.fixture
def mock_model_explanation():
    """Mock model explanation/interpretability results."""
    return {
        "feature_importance": [
            {
                "feature": "evidence_count",
                "importance": 0.25,
                "description": "Number of supporting pieces of evidence"
            },
            {
                "feature": "claim_length",
                "importance": 0.18,
                "description": "Length of the claim in tokens"
            },
            {
                "feature": "certainty_words",
                "importance": 0.15,
                "description": "Presence of certainty indicators"
            }
        ],
        "attention_weights": {
            "tokens": ["climate", "change", "causes", "significant", "impacts"],
            "weights": [0.23, 0.21, 0.19, 0.15, 0.12]
        },
        "decision_path": [
            {
                "node": "evidence_count > 2",
                "decision": True,
                "confidence_change": +0.15
            },
            {
                "node": "has_quantitative_data",
                "decision": True,
                "confidence_change": +0.12
            }
        ],
        "counterfactual_examples": [
            {
                "original": "Climate change will cause severe impacts",
                "counterfactual": "Climate change may cause some impacts",
                "prediction_change": -0.23,
                "changed_tokens": ["will", "severe"] 
            }
        ]
    }