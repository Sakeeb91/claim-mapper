"""
Test fixtures package for ML service testing.
"""
from .claim_fixtures import *

try:
    from .model_fixtures import *
except ImportError:
    # Skip model fixtures if torch is not available (CI environment)
    pass
