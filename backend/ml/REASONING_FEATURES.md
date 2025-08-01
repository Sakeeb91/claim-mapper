# Advanced Reasoning Chain Generation Features

## Overview

The ML service has been enhanced with advanced reasoning chain generation capabilities that provide comprehensive logical analysis, fallacy detection, and reasoning quality assessment.

## New Classes and Features

### ReasoningChainGenerator

Enhanced reasoning engine with the following capabilities:

- **Multi-step logical reasoning generation**
- **Logical fallacy detection**
- **Logical gap identification**
- **Premise strength assessment**
- **Evidence requirement identification**
- **Counterargument generation**
- **LLM integration (OpenAI GPT, Anthropic Claude)**

### Reasoning Types Supported

- **Deductive**: General premises → Specific conclusions
- **Inductive**: Specific observations → General conclusions
- **Abductive**: Best explanation for observations

### Complexity Levels

- **Basic**: Simple, clear logical steps
- **Intermediate**: Intermediate connections and alternative perspectives
- **Advanced**: Complex relationships and assumptions analysis
- **Expert**: Sophisticated formal reasoning structures

## New API Endpoints

### 1. `/reasoning/generate` - Generate Advanced Reasoning Chains

**Request:**
```json
{
  "claim": "Renewable energy is essential for sustainable development",
  "evidence": [
    "Solar costs decreased 80% in last decade",
    "Wind power accounts for 10% of global electricity"
  ],
  "reasoning_type": "inductive",
  "complexity": "intermediate",
  "max_steps": 5,
  "use_llm": true,
  "include_analysis": true
}
```

**Response:**
```json
{
  "reasoning_chains": [
    {
      "steps": [...],
      "reasoning_type": "inductive",
      "overall_confidence": 0.85,
      "logical_validity": 0.8,
      "fallacies": [...],
      "logical_gaps": [...],
      "counterarguments": [...],
      "premise_strength": {...},
      "evidence_requirements": [...]
    }
  ],
  "processing_time": 0.234,
  "model_version": "reasoning-chain-generator-v2.0",
  "metadata": {...}
}
```

### 2. `/reasoning/analyze` - Analyze Existing Reasoning

Analyzes a reasoning chain for:
- Logical fallacies
- Logical gaps
- Counterarguments
- Premise strength
- Evidence requirements

### 3. `/reasoning/validate` - Validate Logical Structure

Validates reasoning steps for:
- Logical validity
- Step connections
- Overall reasoning quality

### 4. `/reasoning/gaps` - Identify Logical Gaps

Identifies specific gaps in reasoning:
- Missing premises
- Weak connections
- Unsupported assumptions

### 5. `/reasoning/strengthen` - Improve Reasoning

Suggests improvements:
- Additional reasoning steps
- Evidence requirements
- Structural enhancements

### 6. `/reasoning/multi-claim` - Multi-Claim Analysis

Analyzes reasoning networks across multiple related claims:
- Cross-claim relationships
- Network validity
- Inconsistency detection

## Logical Fallacy Detection

Detects common logical fallacies:

- **Ad Hominem**: Attacking the person, not the argument
- **Straw Man**: Misrepresenting opponent's argument
- **False Dichotomy**: Presenting only two options when more exist
- **Circular Reasoning**: Using conclusion as premise
- **Hasty Generalization**: Broad conclusions from limited examples
- **Appeal to Authority**: Inappropriate reliance on authority
- **Slippery Slope**: Assuming extreme consequences
- **False Cause**: Incorrect causal relationships
- **Appeal to Emotion**: Using emotions instead of logic
- **Bandwagon**: Popular opinion as truth

## Logical Gap Types

Identifies various reasoning gaps:

- **Missing Premise**: No foundational assumptions stated
- **Invalid Inference**: Conclusions don't follow from premises
- **Weak Connection**: Poor logical flow between steps
- **Unsupported Assumption**: Claims without evidence
- **Contradictory Evidence**: Conflicting information

## LLM Integration

### Supported Models

- **OpenAI GPT-4**: Advanced reasoning generation
- **Anthropic Claude**: Sophisticated logical analysis
- **Fallback Models**: Local transformer models when LLMs unavailable

### Prompt Engineering

- **Chain-of-thought prompting** for structured reasoning
- **Context-aware prompts** based on reasoning type and complexity
- **Structured output formatting** for consistent parsing

## Integration with Existing Services

### ClaimExtractor Integration
- Uses extracted claims as reasoning inputs
- Contextualizes reasoning with claim metadata

### SemanticAnalyzer Integration
- Validates semantic relationships in reasoning
- Enhances cross-claim analysis

### QualityScorer Integration
- Incorporates reasoning quality into overall claim assessment
- Provides comprehensive quality metrics

## Usage Examples

### Basic Reasoning Generation

```python
from services.reasoning_engine import ReasoningChainGenerator
from models.schemas import ReasoningType, ReasoningComplexity

generator = ReasoningChainGenerator()

result = await generator.generate_reasoning_chain(
    claim="Exercise improves mental health",
    evidence=["Endorphin release", "Stress reduction", "Better sleep"],
    reasoning_type=ReasoningType.DEDUCTIVE,
    complexity=ReasoningComplexity.INTERMEDIATE,
    max_steps=5,
    use_llm=True
)
```

### Fallacy Detection

```python
fallacies = await generator._detect_fallacies(reasoning_chain)
for fallacy in fallacies:
    print(f"{fallacy['type']}: {fallacy['description']}")
```

### Gap Analysis

```python
gaps = await generator._identify_logical_gaps(reasoning_chain, evidence)
for gap in gaps:
    print(f"{gap['type']} (severity: {gap['severity']}): {gap['description']}")
```

## Testing

### Unit Tests
- `test_advanced_reasoning.py`: Core functionality tests
- Tests for fallacy detection, gap analysis, premise strength

### Integration Tests
- `test_reasoning_api.py`: API endpoint tests
- End-to-end reasoning generation and analysis

### Demo Script
- `demo_advanced_reasoning.py`: Interactive demonstrations
- Shows all major features with examples

## Performance Considerations

### Processing Time
- Local models: ~1-3 seconds per reasoning chain
- LLM integration: ~3-10 seconds depending on complexity
- Caching for repeated analyses

### Memory Usage
- Transformer models: ~2-4GB RAM
- LLM API calls: Minimal local memory
- Efficient fallacy pattern matching

### Scalability
- Async processing for concurrent requests
- Batch processing support for multiple claims
- Configurable complexity levels for performance tuning

## Configuration

### Environment Variables

```bash
# OpenAI Integration
OPENAI_API_KEY=your_openai_key

# Anthropic Integration  
ANTHROPIC_API_KEY=your_anthropic_key

# Model Configuration
REASONING_COMPLEXITY_DEFAULT=intermediate
REASONING_MAX_STEPS_DEFAULT=7
REASONING_USE_LLM_DEFAULT=true
```

### Model Selection Priority

1. Anthropic Claude (if available)
2. OpenAI GPT-4 (if available)
3. Local transformer models (fallback)

## Future Enhancements

### Planned Features
- **Formal logic validation** using symbolic reasoning
- **Argument mapping** with visual representations
- **Cross-linguistic reasoning** support
- **Domain-specific reasoning** patterns
- **Interactive reasoning** refinement

### Model Improvements
- **Fine-tuned reasoning models** for specific domains
- **Ensemble reasoning** combining multiple approaches
- **Adversarial reasoning** testing for robustness
- **Reasoning explanation** generation

## Dependencies

### Core Requirements
- `transformers>=4.35.2`: Local model support
- `openai>=1.3.8`: OpenAI GPT integration
- `anthropic>=0.8.1`: Anthropic Claude integration
- `pydantic>=2.5.0`: Data validation
- `fastapi>=0.104.1`: API framework

### Optional Dependencies
- `torch>=2.1.0`: GPU acceleration
- `sentence-transformers>=2.2.2`: Semantic similarity
- `spacy>=3.7.2`: NLP preprocessing

## Contributing

When adding new reasoning features:

1. **Add tests** in `test_advanced_reasoning.py`
2. **Update schemas** in `models/schemas.py`
3. **Document API changes** in this file
4. **Add demo examples** in `demo_advanced_reasoning.py`
5. **Ensure backward compatibility** with existing APIs

## License

This enhancement maintains the same license as the parent project.