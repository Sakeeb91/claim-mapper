# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claim Mapper is an interactive knowledge graph visualization system for claims, evidence, and reasoning chains. It's a full-stack application combining a Next.js frontend with TypeScript/Express.js backend services and a Python ML service for AI-powered claim analysis.

## Architecture

### Multi-Service Architecture
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + D3.js
- **API Server**: Express.js + TypeScript + MongoDB + Redis
- **WebSocket Server**: Socket.io for real-time collaboration
- **ML Service**: Python FastAPI with NLP models (transformers, spaCy, etc.)
- **Databases**: MongoDB (primary), Redis (cache/sessions)

### Key Technologies
- **Visualization**: D3.js for interactive force-directed graphs
- **State Management**: Zustand (frontend)
- **Real-time**: Socket.io for collaborative editing
- **AI/ML**: OpenAI GPT, Anthropic Claude, sentence-transformers, spaCy
- **Containerization**: Docker with docker-compose for development

## Development Commands

### Quick Start
```bash
# Start full development environment
npm run docker:dev

# Manual setup alternative
chmod +x scripts/setup.sh && ./scripts/setup.sh
```

### Frontend Development
```bash
npm run dev              # Start Next.js dev server (port 3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # ESLint
npm run type-check       # TypeScript checking
npm run format           # Prettier formatting
```

### Backend API Development
```bash
cd backend/api
npm run dev              # Start API dev server (port 8000)
npm run build            # Compile TypeScript
npm run test             # Run Jest tests
npm run lint             # ESLint for backend
npm run format           # Prettier for backend
```

### ML Service Development
```bash
cd backend/ml
# Python service runs on port 8002
pip install -r requirements.txt
python main.py           # Start FastAPI server
pytest                   # Run Python tests
black .                  # Format Python code
flake8 .                 # Lint Python code
mypy .                   # Type checking
```

### Docker Operations
```bash
npm run docker:build                                    # Build all images
docker-compose -f docker-compose.dev.yml up            # Start all services
docker-compose -f docker-compose.dev.yml down          # Stop all services
docker-compose -f docker-compose.dev.yml logs -f api   # View API logs
```

### Service Ports
- Frontend: http://localhost:3000
- API: http://localhost:8000  
- WebSocket: ws://localhost:8001
- ML Service: http://localhost:8002
- MongoDB: mongodb://localhost:27017
- Redis: redis://localhost:6379

## Code Architecture & Patterns

### Frontend Structure
- **App Router**: Next.js 14 app directory structure
- **Components**: Organized by feature (graph/, claims/, collaboration/, etc.)
- **State**: Zustand stores in `src/store/`
- **Types**: Shared TypeScript definitions in `src/types/`
- **Services**: API clients and WebSocket handling in `src/services/`

### Backend API Structure
- **Routes**: Feature-based routing in `src/routes/` (claims.ts, graph.ts, etc.)
- **Models**: Mongoose schemas in `src/models/` (Claim.ts, Evidence.ts, etc.)
- **Middleware**: Express middleware in `src/middleware/`
- **Database**: MongoDB connection config in `src/config/database.ts`

### ML Service Structure
- **FastAPI**: Main application in `main.py` with 6+ reasoning endpoints
- **Services**: ML processing in `services/` (reasoning_engine.py, claim_extractor.py, etc.)
- **Models**: Pydantic schemas in `models/schemas.py`
- **Advanced Features**: Reasoning chain generation, fallacy detection, semantic analysis

### Key Components
- **D3.js Graphs**: Interactive force-directed visualizations in `src/components/graph/`
- **Real-time Collaboration**: Socket.io integration for live editing
- **Reasoning Engine**: Advanced NLP pipeline with LLM integration
- **Graph Analysis**: NetworkX-based relationship analysis

## Important Patterns

### State Management
- Use Zustand for frontend state (`useAppStore`)
- Backend state managed through MongoDB + Redis
- Real-time updates via Socket.io WebSocket connections

### Data Flow
1. Frontend makes API calls to Express.js backend (port 8000)
2. Backend queries MongoDB and communicates with ML service (port 8002)
3. ML service processes with transformers/spaCy and returns analysis
4. Real-time updates broadcast via WebSocket server (port 8001)

### Testing Strategy
- Frontend: No tests currently implemented
- Backend API: Jest with TypeScript
- ML Service: pytest with asyncio
- Run tests: `npm test` (API) or `pytest` (ML)

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier configured for both frontend and backend
- Python: Black formatter + flake8 linter + mypy type checking
- Import organization: Absolute imports with path mapping

### Environment Variables
- Development: Uses docker-compose environment variables
- Check `docker-compose.dev.yml` for service configuration
- ML service uses `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` for LLM features

## Key Files to Understand

### Critical Architecture Files
- `src/components/graph/KnowledgeGraph.tsx` - Main D3.js visualization
- `backend/api/src/server.ts` - Express.js application entry
- `backend/ml/main.py` - FastAPI ML service with advanced reasoning
- `backend/ml/services/reasoning_engine.py` - Core reasoning logic
- `src/store/useAppStore.ts` - Frontend state management

### Configuration Files
- `docker-compose.dev.yml` - Multi-service development setup
- `next.config.js` - Next.js configuration
- `backend/api/tsconfig.json` - Backend TypeScript config
- `backend/ml/requirements.txt` - Python dependencies

### Database Models
- `backend/api/src/models/Claim.ts` - Claim data structure
- `backend/api/src/models/Evidence.ts` - Evidence relationships
- `backend/ml/models/schemas.py` - ML service Pydantic models

## Common Development Tasks

### Adding New Features
1. Define TypeScript interfaces in `src/types/`
2. Add API routes in `backend/api/src/routes/`
3. Create frontend components in appropriate `src/components/` subdirectory
4. Update ML service if AI analysis needed in `backend/ml/services/`
5. Add real-time updates via WebSocket if needed

### Database Changes
1. Update Mongoose models in `backend/api/src/models/`
2. Add corresponding TypeScript types in `src/types/`
3. Update ML service Pydantic schemas if needed

### Graph Visualization Changes
1. Modify D3.js components in `src/components/graph/`
2. Update graph data structures in backend models
3. Ensure real-time updates work with Socket.io

## Development Notes

### ML Service Features
The ML service (`backend/ml/`) includes advanced reasoning capabilities:
- Fallacy detection with regex patterns
- Logical gap identification
- Premise strength assessment  
- OpenAI GPT and Anthropic Claude integration
- Comprehensive reasoning chain generation

### Docker Development
- All services run in Docker containers for development
- Use `npm run docker:dev` for complete environment
- Individual services can be started manually if needed
- Check service health at `/health` endpoints

### Real-time Collaboration
- Socket.io handles live cursors, comments, and collaborative editing
- WebSocket server runs separately on port 8001
- Redis used for session management and real-time data

### Performance Considerations
- D3.js graphs can become complex with large datasets
- ML service includes caching for expensive operations
- Redis caching for frequently accessed data
- Consider virtualization for large claim networks