"""
Pytest configuration and fixtures for ML service testing.
"""
import asyncio
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import numpy as np
import pandas as pd
from pathlib import Path
import tempfile
import shutil
from typing import Dict, List, Any

# Import test fixtures
from tests.fixtures.claim_fixtures import *
from tests.fixtures.model_fixtures import *


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def temp_dir():
    """Create a temporary directory for test files."""
    temp_dir = tempfile.mkdtemp()
    yield Path(temp_dir)
    shutil.rmtree(temp_dir)


@pytest.fixture
def sample_text():
    """Sample text for testing NLP processing."""
    return "Climate change is causing significant environmental impacts worldwide."


@pytest.fixture
def sample_claim():
    """Sample claim data for testing."""
    return {
        "id": "claim_001",
        "text": "Renewable energy reduces carbon emissions significantly",
        "type": "factual",
        "confidence": 0.85,
        "evidence": [
            "Solar power generation has increased by 300% since 2010",
            "Wind energy accounts for 8% of global electricity production"
        ],
        "metadata": {
            "source": "test",
            "domain": "environment"
        }
    }


@pytest.fixture
def sample_evidence():
    """Sample evidence data for testing."""
    return [
        {
            "text": "According to NASA data, global temperatures have risen 1.1°C since 1880",
            "source": "NASA Climate Change",
            "reliability": 0.95,
            "type": "statistical"
        },
        {
            "text": "The IPCC reports high confidence in human influence on climate",
            "source": "IPCC AR6",
            "reliability": 0.98,
            "type": "expert_opinion"
        }
    ]


@pytest.fixture
def mock_redis():
    """Mock Redis client for testing."""
    import fakeredis
    return fakeredis.FakeRedis()


@pytest.fixture
def mock_mongodb():
    """Mock MongoDB client for testing."""
    import mongomock
    return mongomock.MongoClient()


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for testing."""
    with patch('openai.AsyncOpenAI') as mock:
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = AsyncMock(
            choices=[
                AsyncMock(
                    message=AsyncMock(
                        content='{"score": 0.85, "analysis": "test analysis"}'
                    )
                )
            ]
        )
        mock.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_anthropic_client():
    """Mock Anthropic client for testing."""
    with patch('anthropic.AsyncAnthropic') as mock:
        mock_client = AsyncMock()
        mock_client.messages.create.return_value = AsyncMock(
            content=[
                AsyncMock(
                    text='{"reasoning": "test reasoning", "confidence": 0.8}'
                )
            ]
        )
        mock.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_sentence_transformer():
    """Mock sentence transformer model."""
    with patch('sentence_transformers.SentenceTransformer') as mock:
        mock_model = MagicMock()
        mock_model.encode.return_value = np.random.rand(384)  # Standard embedding size
        mock.return_value = mock_model
        yield mock_model


@pytest.fixture
def mock_spacy_model():
    """Mock spaCy NLP model."""
    with patch('spacy.load') as mock:
        mock_nlp = MagicMock()
        mock_doc = MagicMock()
        mock_doc.ents = []
        mock_doc.sents = [MagicMock(text="Sample sentence.")]
        mock_nlp.return_value = mock_doc
        mock.return_value = mock_nlp
        yield mock_nlp


@pytest.fixture
def mock_torch_model():
    """Mock PyTorch model for testing."""
    with patch('torch.load') as mock_load, \
         patch('torch.save') as mock_save:
        
        mock_model = MagicMock()
        mock_model.eval.return_value = mock_model
        mock_model.forward.return_value = MagicMock(
            logits=np.array([[0.1, 0.9]])
        )
        mock_load.return_value = mock_model
        yield mock_model


@pytest.fixture
def sample_reasoning_chain():
    """Sample reasoning chain for testing."""
    return {
        "type": "deductive",
        "premises": [
            "All renewable energy sources reduce carbon emissions",
            "Solar power is a renewable energy source"
        ],
        "conclusion": "Solar power reduces carbon emissions",
        "steps": [
            {
                "step": 1,
                "description": "Identify major premise",
                "content": "All renewable energy sources reduce carbon emissions"
            },
            {
                "step": 2,
                "description": "Identify minor premise",
                "content": "Solar power is a renewable energy source"
            },
            {
                "step": 3,
                "description": "Apply deductive reasoning",
                "content": "Therefore, solar power reduces carbon emissions"
            }
        ],
        "validity_score": 0.92
    }


@pytest.fixture
def sample_graph_data():
    """Sample graph data for testing."""
    return {
        "nodes": [
            {
                "id": "claim_1",
                "type": "claim",
                "text": "Climate change is real",
                "confidence": 0.95
            },
            {
                "id": "evidence_1",
                "type": "evidence",
                "text": "Global temperature data shows warming trend",
                "reliability": 0.9
            }
        ],
        "edges": [
            {
                "source": "evidence_1",
                "target": "claim_1",
                "type": "supports",
                "strength": 0.8
            }
        ]
    }


@pytest.fixture
def mock_fastapi_app():
    """Mock FastAPI application for testing."""
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    
    app = FastAPI()
    
    @app.get("/health")
    async def health():
        return {"status": "ok"}
    
    return TestClient(app)


# Environment setup fixtures
@pytest.fixture(autouse=True)
def setup_test_environment(monkeypatch):
    """Set up test environment variables."""
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/1")
    monkeypatch.setenv("MONGODB_URL", "mongodb://localhost:27017/test")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")


# Performance testing fixtures
@pytest.fixture
def performance_timer():
    """Timer for performance testing."""
    import time
    
    class Timer:
        def __init__(self):
            self.start_time = None
            self.end_time = None
        
        def start(self):
            self.start_time = time.time()
        
        def stop(self):
            self.end_time = time.time()
        
        @property
        def elapsed(self):
            if self.start_time and self.end_time:
                return self.end_time - self.start_time
            return None
    
    return Timer()


# Model validation fixtures
@pytest.fixture
def model_validator():
    """Validator for ML model outputs."""
    class ModelValidator:
        @staticmethod
        def validate_confidence_score(score):
            return 0.0 <= score <= 1.0
        
        @staticmethod
        def validate_embedding(embedding, expected_dim=384):
            return (
                isinstance(embedding, np.ndarray) and
                embedding.shape == (expected_dim,) and
                not np.isnan(embedding).any()
            )
        
        @staticmethod
        def validate_classification(result):
            return (
                isinstance(result, dict) and
                'label' in result and
                'confidence' in result and
                0.0 <= result['confidence'] <= 1.0
            )
    
    return ModelValidator()


# Database fixtures for integration tests
@pytest.fixture
async def test_database():
    """Set up test database with sample data."""
    # This would connect to a real test database in integration tests
    # For now, return mock data
    return {
        "claims": [],
        "evidence": [],
        "projects": []
    }


# Cleanup fixtures
@pytest.fixture(autouse=True)
def cleanup_after_test():
    """Clean up after each test."""
    yield
    # Cleanup code would go here
    # e.g., clear caches, reset global state, etc.


# Custom markers for test organization
def pytest_configure(config):
    """Configure custom pytest markers."""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "gpu: mark test as requiring GPU"
    )
    config.addinivalue_line(
        "markers", "external: mark test as requiring external services"
    )
    config.addinivalue_line(
        "markers", "model: mark test as testing ML models"
    )


# Test data collection hook
def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers based on file paths."""
    for item in items:
        # Add markers based on test file location
        if "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        
        # Add slow marker to specific tests
        if "slow" in item.name or "performance" in item.name:
            item.add_marker(pytest.mark.slow)
        
        # Add model marker to ML model tests
        if any(keyword in str(item.fspath) for keyword in ["model", "reasoning", "extraction"]):
            item.add_marker(pytest.mark.model)