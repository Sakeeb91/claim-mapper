# Testing Infrastructure

This document outlines the comprehensive testing strategy and infrastructure for the Claim Mapper system, covering frontend, backend, and ML service testing.

## Overview

The testing infrastructure is designed to ensure reliability, performance, and security across all system components:

- **Frontend**: React components, hooks, and services
- **Backend API**: Express.js endpoints, middleware, and database operations  
- **ML Service**: NLP models, reasoning engines, and claim extraction
- **E2E**: Critical user journeys and integration flows

## Test Categories

### 1. Unit Tests
- **Coverage Target**: 80%+
- **Focus**: Individual functions, components, and modules
- **Frameworks**: Jest (Frontend/Backend), pytest (ML)
- **Execution**: Fast (~1-2 seconds per test)

### 2. Integration Tests  
- **Coverage Target**: 75%+
- **Focus**: Service interactions, API endpoints, database operations
- **Frameworks**: Jest + Supertest (Backend), pytest (ML)
- **Execution**: Medium (~5-10 seconds per test)

### 3. End-to-End Tests
- **Coverage**: Critical user workflows
- **Focus**: Complete user journeys, cross-service integration
- **Framework**: Playwright
- **Execution**: Slow (~30-60 seconds per test)

### 4. Performance Tests
- **Focus**: Load testing, response times, resource usage
- **Tools**: Lighthouse CI (Frontend), custom benchmarks (ML)
- **Execution**: On main branch only

### 5. Security Tests
- **Focus**: Vulnerability scanning, dependency audits
- **Tools**: Trivy, npm audit
- **Execution**: Every CI run

## Frontend Testing

### Setup
```bash
npm install
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Test Structure
```
src/
├── components/
│   ├── __tests__/
│   │   ├── KnowledgeGraph.test.tsx
│   │   └── UniversalSearchBar.test.tsx
│   └── ...
├── hooks/
│   ├── __tests__/
│   │   └── useSearch.test.ts
│   └── ...
└── services/
    ├── __tests__/
    │   └── api.test.ts
    └── ...
```

### Key Features
- **React Testing Library**: User-centric testing approach
- **MSW**: API mocking for integration tests
- **Jest Axe**: Accessibility testing
- **Snapshot Testing**: Component regression detection

### Example Test
```typescript
// src/components/__tests__/KnowledgeGraph.test.tsx
import { render, screen } from '@testing-library/react'
import { KnowledgeGraph } from '../KnowledgeGraph'

test('renders knowledge graph with nodes', () => {
  const mockData = { nodes: [...], links: [...] }
  render(<KnowledgeGraph data={mockData} />)
  
  expect(screen.getByRole('img')).toBeInTheDocument()
  expect(screen.getByText('3 nodes, 2 connections')).toBeInTheDocument()
})
```

## Backend API Testing

### Setup
```bash
cd backend/api
npm install
npm run test              # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # Coverage report
```

### Test Structure
```
backend/api/
├── src/
│   ├── routes/
│   │   ├── __tests__/
│   │   │   └── claims.test.ts
│   │   └── ...
│   ├── middleware/
│   │   ├── __tests__/
│   │   │   └── auth.test.ts
│   │   └── ...
│   └── models/
│       ├── __tests__/
│       │   └── Claim.test.ts
│       └── ...
└── tests/
    ├── fixtures/
    ├── globalSetup.js
    └── globalTeardown.js
```

### Key Features
- **MongoDB Memory Server**: In-memory database for tests
- **Supertest**: HTTP endpoint testing
- **Redis Mock**: Cache layer testing
- **JWT Mocking**: Authentication testing

### Example Test
```typescript
// src/routes/__tests__/claims.test.ts
import request from 'supertest'
import app from '../../app'

describe('Claims API', () => {
  test('GET /api/claims returns paginated results', async () => {
    const response = await request(app)
      .get('/api/claims')
      .set('Authorization', `Bearer ${testToken}`)
      
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.pagination).toBeDefined()
  })
})
```

## ML Service Testing

### Setup
```bash
cd backend/ml
pip install -r requirements.txt
python -m spacy download en_core_web_sm

pytest                    # All tests
pytest tests/unit/        # Unit tests only
pytest tests/integration/ # Integration tests only
pytest --cov=services     # Coverage report
```

### Test Structure
```
backend/ml/
├── tests/
│   ├── unit/
│   │   ├── test_claim_extractor.py
│   │   └── test_reasoning_engine.py
│   ├── integration/
│   │   └── test_api_endpoints.py
│   ├── fixtures/
│   │   ├── claim_fixtures.py
│   │   └── model_fixtures.py
│   └── conftest.py
├── services/
└── models/
```

### Key Features
- **Mock Models**: Avoid loading heavy ML models in tests
- **Async Testing**: Full async/await support
- **Parametrized Tests**: Test multiple scenarios efficiently
- **Performance Monitoring**: Track inference times

### Example Test
```python
# tests/unit/test_claim_extractor.py
import pytest
from services.claim_extractor import ClaimExtractor

@pytest.mark.asyncio
async def test_extract_claims_basic(claim_extractor, sample_text):
    result = await claim_extractor.extract_claims(sample_text)
    
    assert result is not None
    assert len(result.claims) > 0
    assert result.processing_time > 0
```

## E2E Testing

### Setup
```bash
npm install
npx playwright install
npm run test:e2e     # Run E2E tests
npm run test:e2e:ui  # Interactive mode
```

### Test Structure
```
e2e/
├── search-workflow.spec.ts
├── knowledge-graph.spec.ts
├── collaboration.spec.ts
└── auth-flow.spec.ts
```

### Key Features
- **Multi-browser Testing**: Chrome, Firefox, Safari
- **Mobile Testing**: Responsive design validation
- **Visual Regression**: Screenshot comparisons
- **Network Mocking**: Simulate API failures

### Example Test
```typescript
// e2e/search-workflow.spec.ts
import { test, expect } from '@playwright/test'

test('should perform search and display results', async ({ page }) => {
  await page.goto('/search')
  
  await page.fill('input[placeholder*="Search claims"]', 'climate change')
  await page.press('input[placeholder*="Search claims"]', 'Enter')
  
  await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
})
```

## Performance Testing

### Lighthouse CI
```bash
npm run build
npx lighthouse-ci autorun
```

Monitors:
- Performance scores (>80%)
- Accessibility compliance (>90%)
- Best practices adherence
- SEO optimization

### Load Testing
```bash
# Backend API load testing
cd backend/api
npm run test:load

# ML Service benchmarking  
cd backend/ml
pytest tests/performance/ -m performance
```

## CI/CD Integration

### GitHub Actions Workflow

The CI pipeline runs:

1. **Parallel Test Execution**
   - Frontend tests
   - Backend tests  
   - ML service tests

2. **E2E Testing**
   - Multi-browser validation
   - Mobile responsive testing

3. **Security Scanning**
   - Dependency vulnerability checks
   - Code security analysis

4. **Performance Monitoring**
   - Lighthouse CI on main branch
   - Performance regression detection

5. **Deployment**
   - Automatic deployment on passing tests
   - Artifact generation for releases

### Coverage Reporting

- **Codecov Integration**: Automated coverage reporting
- **Coverage Gates**: Minimum 80% for new code
- **Visual Coverage Reports**: HTML reports for local development

## Running Tests Locally

### All Tests
```bash
# Frontend
npm test

# Backend
cd backend/api && npm test

# ML Service
cd backend/ml && pytest

# E2E
npm run test:e2e
```

### Coverage Reports
```bash
# Frontend
npm run test:coverage
open coverage/lcov-report/index.html

# Backend
cd backend/api && npm run test:coverage
open coverage/lcov-report/index.html

# ML Service
cd backend/ml && pytest --cov=services --cov-report=html
open htmlcov/index.html
```

### Watch Mode (Development)
```bash
# Frontend
npm run test:watch

# Backend
cd backend/api && npm run test:watch

# ML Service
cd backend/ml && pytest --watch tests/
```

## Test Data Management

### Fixtures and Mocks
- **Deterministic**: Consistent test data across runs
- **Realistic**: Representative of production data
- **Isolated**: No external dependencies
- **Fast**: Quick setup and teardown

### Database Testing
- **In-Memory**: MongoDB Memory Server for speed
- **Transactions**: Rollback after each test
- **Seeding**: Consistent initial state
- **Cleanup**: Automatic data cleanup

## Best Practices

### Writing Tests
1. **Descriptive Names**: Clear test intent
2. **Single Responsibility**: One assertion per test
3. **AAA Pattern**: Arrange, Act, Assert
4. **Error Cases**: Test failure scenarios
5. **Performance**: Monitor test execution time

### Maintaining Tests
1. **Green Pipeline**: Keep tests passing
2. **Regular Updates**: Update with code changes
3. **Flaky Test Detection**: Monitor and fix unstable tests
4. **Coverage Monitoring**: Maintain coverage thresholds
5. **Documentation**: Keep test docs updated

### Debugging Tests
1. **Isolation**: Run individual tests
2. **Verbose Output**: Use debug flags
3. **Mock Inspection**: Verify mock calls
4. **State Debugging**: Check test state
5. **CI/Local Parity**: Ensure consistent behavior

## Troubleshooting

### Common Issues

**Tests timing out**: Increase timeout or optimize test setup
```javascript
// jest.config.js
module.exports = {
  testTimeout: 30000
}
```

**Memory leaks**: Ensure proper cleanup in teardown
```javascript
afterEach(() => {
  jest.clearAllMocks()
  // Additional cleanup
})
```

**Flaky E2E tests**: Add proper waits and retries
```typescript
await page.waitForSelector('[data-testid="content"]', { timeout: 10000 })
```

### Getting Help

1. Check test logs for specific error messages
2. Run tests locally with verbose output
3. Review CI logs for environment-specific issues
4. Consult test documentation for framework-specific guidance
5. Use debugging tools provided by each testing framework

## Continuous Improvement

The testing infrastructure is continuously evolving:

- **Metrics Monitoring**: Track test execution times and flakiness
- **Coverage Analysis**: Identify untested code paths
- **Performance Benchmarking**: Monitor regression in test performance
- **Tool Updates**: Keep testing frameworks and tools current
- **Feedback Integration**: Incorporate developer feedback for better DX