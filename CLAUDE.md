# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claim Mapper is an interactive knowledge graph visualization system for claims, evidence, and reasoning chains. It's a full-stack application with a Next.js frontend, Express.js backend API, Socket.io WebSocket server, and Python FastAPI ML service for AI-powered claim analysis.

**Recent Reorganization (2025-11-03)**: The codebase has been comprehensively restructured for better maintainability:
- Centralized constants (`src/constants/`, `backend/api/src/constants/`)
- Shared types package (`packages/shared-types/`)
- Business logic separation (`src/lib/`, `backend/api/src/lib/`)
- Barrel exports via index files for cleaner imports
- Consolidated documentation in `docs/` directory
- Reorganized ML test structure and examples

## Architecture

### Multi-Service Architecture
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + D3.js (port 3000)
- **API Server**: Express.js + TypeScript + MongoDB + Redis (port 8000)
- **WebSocket Server**: Socket.io for real-time collaboration (port 8001)
- **ML Service**: Python FastAPI with NLP models - transformers, spaCy, sentence-transformers (port 8002)
- **Databases**: MongoDB (port 27017), Redis (port 6379)

### Key Technologies
- **Visualization**: D3.js force-directed graphs in `src/components/graph/`
- **State Management**: Zustand stores in `src/store/` (frontend), MongoDB + Redis (backend)
- **Real-time**: Socket.io for collaborative editing, live cursors, comments
- **AI/ML**: OpenAI GPT, Anthropic Claude integration, sentence-transformers, spaCy NER
- **Forms & Validation**: React Hook Form + Zod validation
- **Authentication**: JWT-based with bcrypt hashing
- **Containerization**: Docker Compose for development orchestration

## Development Setup & Commands

### Quick Start
```bash
# Automated setup (recommended first time)
chmod +x scripts/setup.sh && ./scripts/setup.sh

# Or start all services with Docker
npm run docker:dev

# Manual alternative (run in separate terminals)
npm run dev              # Frontend only
cd backend/api && npm run dev   # API only
docker run -d -p 27017:27017 mongo:7.0
docker run -d -p 6379:6379 redis:7.2-alpine
```

### Frontend Development
```bash
npm run dev              # Next.js dev server with hot reload (port 3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npm run type-check       # TypeScript type checking
npm run format           # Prettier formatting
```

### Backend API Development
```bash
cd backend/api
npm run dev              # API dev server with tsx watch (port 8000)
npm run build            # Compile TypeScript to dist/
npm run start            # Run compiled production server
npm run lint             # ESLint for backend
npm run format           # Prettier for backend
```

### ML Service Development
```bash
cd backend/ml
pip install -r requirements.txt      # Install dependencies
python -m spacy download en_core_web_sm  # Download required spaCy model
uvicorn main:app --host 0.0.0.0 --port 8002 --reload  # Start with auto-reload
python main.py           # Alternative: run directly

# Code quality
black .                  # Format Python code
flake8 .                 # Lint Python code
mypy .                   # Type checking
```

### Testing

#### Frontend Tests
```bash
npm run test             # Run all Jest tests
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report
npm run test:ci          # CI mode (no watch, with coverage)
```

#### Backend API Tests
```bash
cd backend/api
npm run test             # All tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:ci          # CI mode
```

#### ML Service Tests
```bash
cd backend/ml
pytest                   # All tests
pytest tests/unit/       # Unit tests only
pytest tests/integration/ # Integration tests only
pytest --cov=services    # With coverage
pytest --cov=services --cov-report=html  # HTML coverage report
pytest -v                # Verbose output
pytest -m "not external" # Skip external API tests
```

#### E2E Tests
```bash
npm run test:e2e         # Run all Playwright E2E tests
npm run test:e2e:ui      # Interactive UI mode
npm run test:e2e:ci      # Smoke tests only (Chromium, for CI)
npx playwright install   # Install browser dependencies (first time)
```

### Docker Operations
```bash
npm run docker:dev       # Start all services
npm run docker:build     # Build all images
docker-compose -f docker-compose.dev.yml up          # Start services
docker-compose -f docker-compose.dev.yml up -d       # Start in background
docker-compose -f docker-compose.dev.yml down        # Stop all services
docker-compose -f docker-compose.dev.yml logs -f api # View API logs
docker-compose -f docker-compose.dev.yml ps          # Check service status
```

## Code Architecture

### Frontend Structure
```
src/
├── app/              # Next.js 14 App Router pages and layouts
├── components/       # React components organized by feature (all have index.ts)
│   ├── ui/          # Reusable UI components (Button, Modal, Input, etc.)
│   ├── graph/       # D3.js knowledge graph (KnowledgeGraph, GraphControls, etc.)
│   ├── claims/      # Claim management components
│   ├── search/      # Search UI (UniversalSearchBar, SearchResults, etc.)
│   └── collaboration/ # Real-time (CollaborativeEditor, LiveCursors, etc.)
├── constants/       # 🆕 Centralized constants
│   ├── api.ts       # API URLs and endpoints
│   ├── graph.ts     # Graph colors, sizes, config
│   ├── routes.ts    # Application routes
│   └── validation.ts # Validation limits
├── hooks/           # Custom React hooks (with index.ts)
├── lib/             # 🆕 Business logic layer
│   ├── graph/       # layoutEngine.ts, filterEngine.ts
│   ├── search/      # queryParser.ts
│   └── validation/  # claimValidator.ts
├── services/        # API clients and WebSocket (with index.ts)
├── store/           # Zustand state management stores
├── types/           # Shared TypeScript type definitions
└── utils/           # Utility functions and helpers
```

### Backend API Structure
```
backend/api/src/
├── config/          # Database and service configuration
│   ├── database.ts  # MongoDB connection
│   ├── redis.ts     # Redis connection manager
│   └── vectordb.ts  # 🆕 Pinecone vector database config
├── constants/       # Server constants
│   ├── errors.ts    # Error messages and codes
│   ├── status.ts    # HTTP and entity status codes
│   └── validation.ts # Validation limits and patterns
├── lib/             # Business logic layer
│   ├── graph/       # analyzer.ts (graph metrics, central nodes)
│   ├── reasoning/   # Reasoning chain builders
│   └── validation/  # Validation schemas
├── middleware/      # Express middleware (auth, validation, etc.)
├── models/          # Mongoose schemas (Claim.ts, Evidence.ts, etc.)
├── routes/          # Express route handlers (claims.ts, graph.ts, etc.)
├── services/        # 🆕 Backend services
│   ├── embedding.ts # OpenAI embedding generation
│   ├── vectorStore.ts # Pinecone CRUD operations
│   └── ingestion/   # Document ingestion pipeline
│       ├── index.ts # Ingestion orchestrator
│       └── chunker.ts # Text chunking service
├── utils/           # Server-side utilities
├── websocket/       # Socket.io WebSocket handlers
├── scripts/         # 🆕 Utility scripts
│   └── sync-vector-db.ts # Vector DB migration script
└── server.ts        # Main Express application entry point
```

### ML Service Structure
```
backend/ml/
├── main.py          # FastAPI application with 6+ reasoning endpoints
├── examples/        # 🆕 Demo files (moved from root)
│   ├── demo_service.py
│   └── demo_advanced_reasoning.py
├── services/        # NLP processing services
│   ├── reasoning_engine.py    # Core reasoning logic with LLM integration
│   ├── claim_extractor.py     # Claim extraction from text
│   ├── argument_miner.py      # Argument structure analysis
│   ├── semantic_analyzer.py   # Semantic similarity and relationships
│   ├── entity_extractor.py    # Named entity recognition
│   └── quality_scorer.py      # Claim quality assessment
├── models/          # Pydantic schemas for request/response models
├── tests/           # 🆕 Reorganized test structure
│   ├── conftest.py  # Moved from root
│   ├── fixtures/    # Test fixtures
│   ├── unit/        # test_services.py, test_claim_extractor.py
│   └── integration/ # test_reasoning_api.py, test_advanced_reasoning.py
└── .env.example     # 🆕 Environment variables template
```

## Important Development Patterns

### State Management & Data Flow
1. **Frontend**: Zustand stores (`useAppStore`) for client state, React Query for server state caching
2. **Backend**: MongoDB for persistence, Redis for sessions and real-time data
3. **Real-time**: Socket.io WebSocket connections for live updates (cursors, comments, collaborative editing)
4. **Data Flow**: Frontend → API (8000) → MongoDB/ML Service (8002) → WebSocket broadcast (8001) → All clients

### Testing Strategy
- **Frontend**: Jest + React Testing Library + MSW for API mocking (currently minimal tests)
- **Backend API**: Jest + Supertest + MongoDB Memory Server + Redis mock
- **ML Service**: pytest with asyncio, parametrized tests, mock models (avoid loading heavy transformers in tests)
- **E2E**: Playwright with multi-browser support (Chrome, Firefox, Safari)
- **Coverage Target**: 80%+ for new code, enforced by Codecov in CI

### CI/CD Pipeline
The GitHub Actions workflow (`.github/workflows/ci.yml`) runs:
1. **Parallel test jobs**: frontend-tests, backend-tests, ml-tests (continue-on-error for ML)
2. **E2E tests**: Smoke tests only on Chromium (after frontend tests pass)
3. **Security scanning**: Trivy vulnerability scanner, npm audit
4. **Performance tests**: Lighthouse CI (main branch only)
5. **Build and deploy**: Creates deployment artifacts (main branch only)

Check CI status after pushing:
```bash
gh run list --limit 5                # View recent workflow runs
gh run view <run-id>                 # Check specific run status
gh run view <run-id> --log-failed    # View failure logs
```

### Code Style & Quality
- **TypeScript**: Strict mode enabled, absolute imports with path mapping
- **ESLint + Prettier**: Configured for both frontend and backend
- **Python**: Black formatter (line length 127) + flake8 linter + mypy type checking
- **Commit Convention**: Conventional commits (feat:, fix:, docs:, style:, refactor:, test:, chore:)

### Environment Variables
- **Development**: Configured in `docker-compose.dev.yml`
- **Example file**: `.env.example` (copy to `.env.local` for local dev)
- **API Keys**: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` for ML service LLM features
- **Database**: `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`
- **Vector DB** (optional): `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `PINECONE_NAMESPACE`

## Key Architecture Files

### Critical Components
- `src/components/graph/KnowledgeGraph.tsx` - Main D3.js force-directed graph visualization
- `backend/api/src/server.ts` - Express.js application entry point with middleware setup
- `backend/ml/main.py` - FastAPI ML service with advanced reasoning endpoints
- `backend/ml/services/reasoning_engine.py` - Core reasoning logic (fallacy detection, gap identification)
- `src/store/useAppStore.ts` - Frontend Zustand state management

### Configuration
- `docker-compose.dev.yml` - Multi-service development orchestration (7 services)
- `next.config.js` - Next.js configuration
- `backend/api/tsconfig.json` - Backend TypeScript config
- `backend/ml/requirements.txt` - Python ML dependencies (full)
- `backend/ml/requirements-ci.txt` - Python ML dependencies (minimal for CI)
- `backend/ml/.env.example` - 🆕 ML service environment variables template
- `playwright.config.ts` - E2E test configuration
- `jest.config.js` - Frontend/backend test configuration
- `packages/shared-types/` - 🆕 Shared TypeScript type definitions

### Database Models
- `backend/api/src/models/Claim.ts` - Claim schema (type, confidence, tags)
- `backend/api/src/models/Evidence.ts` - Evidence relationships (support/contradict/neutral)
- `backend/ml/models/schemas.py` - Pydantic models for ML service

## Service-Specific Notes

### WebSocket Server (port 8001)
- Located in `backend/api/src/websocket/` (integrated with API server)
- Handles real-time collaboration: live cursors, comments, version history
- Uses Redis for session management and pub/sub
- Socket.io events: claim updates, user presence, collaborative editing

### ML Service Advanced Features
The ML service includes sophisticated reasoning capabilities:
- **Fallacy Detection**: Regex pattern matching + LLM-based identification
- **Logical Gap Identification**: Missing premises, unsupported conclusions
- **Premise Strength Assessment**: Evidence quality scoring
- **Reasoning Chain Generation**: Complete argument structure with LLM integration
- **Multi-Claim Analysis**: Network-wide reasoning analysis
- **Performance**: ~200-300ms per document, caching for expensive operations

### D3.js Graph Visualization
- Interactive force-directed graphs with drag, zoom, pan
- Node types: claims (assertions, hypotheses, questions), evidence, reasoning steps
- Link types: supports, contradicts, neutral
- Filtering by type, confidence level, tags
- Search integration with node highlighting
- Performance consideration: virtualization needed for large datasets (>1000 nodes)

### Vector Database & Semantic Search (NEW)
The system includes optional vector database integration for semantic search:
- **Pinecone Integration**: `backend/api/src/config/vectordb.ts` - managed vector DB for embeddings
- **OpenAI Embeddings**: `backend/api/src/services/embedding.ts` - text-embedding-3-large (1536 dims)
- **Vector Store**: `backend/api/src/services/vectorStore.ts` - CRUD operations and similarity search
- **Auto-sync**: Evidence documents automatically sync to vector DB via Mongoose post-save hooks
- **Endpoints**:
  - `POST /api/evidence/search/semantic` - Semantic similarity search
  - `POST /api/evidence/ingest` - Document ingestion with claim extraction
  - `POST /api/evidence/ingest/url` - URL ingestion
- **Migration Script**: `npm run sync:vectordb` - Sync existing evidence to vector DB
- **Optional Feature**: System works without vector DB; semantic features gracefully degrade

### Semantic Linking Pipeline (NEW)
The system includes intelligent premise-to-evidence linking for reasoning chains:
- **Matcher Service**: `backend/api/src/services/linking/matcher.ts` - Orchestrates the full linking pipeline
- **Cross-Encoder Reranking**: `backend/api/src/services/linking/reranker.ts` - LLM-based reranking for precision
- **Relationship Classification**: `backend/api/src/services/linking/classifier.ts` - Classifies support/refute/neutral
- **Deduplication**: `backend/api/src/services/deduplication.ts` - Duplicate detection and clustering
- **Auto-linking**: Reasoning chain generation automatically links evidence to premise steps
- **Endpoints**:
  - `GET /api/reasoning/:id/coverage` - Get evidence coverage stats for all premises
  - `GET /api/reasoning/:id/steps/:stepNumber/evidence` - Get linked evidence for a specific step
- **Frontend Components**:
  - `CoverageHeatmap` - Visual overview of premise support status (green/red/yellow/gray)
  - `EvidenceDrawer` - Slide-out panel showing detailed linked evidence
  - `useCoverage` hook - React Query hook for fetching coverage data

## Documentation

Comprehensive documentation is now organized in the `docs/` directory:
- **Guides**: [Testing](docs/guides/testing.md), [Search Implementation](docs/guides/search.md)
- **Architecture**: [ML Service](docs/architecture/ml-service.md), [Reasoning Features](docs/architecture/reasoning-features.md), [ML Implementation](docs/architecture/ml-implementation.md)
- **Troubleshooting**: [CI/CD Fixes](docs/troubleshooting/ci-fixes.md)

See [docs/README.md](docs/README.md) for the complete documentation index.

## Code Organization Best Practices

### Centralized Constants
Import constants instead of hardcoding values throughout the codebase:

```typescript
// Frontend - src/constants/
import { API_BASE_URL, ML_ENDPOINTS, NODE_COLORS, ROUTES, CLAIM_VALIDATION } from '@/constants';

// Backend - backend/api/src/constants/
import { ERROR_MESSAGES, HTTP_STATUS, VALIDATION_LIMITS } from './constants';
```

### Barrel Exports (Index Files)
Use barrel exports for cleaner, more maintainable imports:

```typescript
// Before
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph';
import { GraphControls } from '@/components/graph/GraphControls';
import { NodeDetailsPanel } from '@/components/graph/NodeDetailsPanel';

// After
import { KnowledgeGraph, GraphControls, NodeDetailsPanel } from '@/components/graph';
```

### Business Logic Separation
Keep business logic separate from UI components and API routes in `lib/` directories:

```typescript
// Frontend business logic - src/lib/
import { FilterEngine } from '@/lib/graph/filterEngine';
import { QueryParser } from '@/lib/search/queryParser';
import { ClaimValidator } from '@/lib/validation/claimValidator';

// Backend business logic - backend/api/src/lib/
import { GraphAnalyzer } from './lib/graph/analyzer';
```

### Shared Types Package
Use centralized type definitions from the shared-types package:

```typescript
// Frontend or Backend
import { Claim, Evidence, GraphNode, ApiResponse, PaginatedResponse } from '@claim-mapper/shared-types';

// Ensures type consistency across all services
```

## Troubleshooting

### Common Issues
- **ML service not starting**: Ensure spaCy model downloaded (`python -m spacy download en_core_web_sm`)
- **Database connection errors**: Check MongoDB/Redis containers running (`docker ps`)
- **Port conflicts**: Check no other services on 3000, 8000, 8001, 8002
- **E2E test failures**: Increase timeouts in `playwright.config.ts`, ensure services running
- **Type errors after deps update**: Run `npm run type-check` and fix incrementally
- **Coverage not generating**: Ensure jest/pytest runs with `--coverage` flag

### Health Checks
```bash
curl http://localhost:8000/health    # API health
curl http://localhost:8002/health    # ML service health
docker-compose -f docker-compose.dev.yml ps  # All service status
```
