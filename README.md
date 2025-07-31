# 🕸️ Claim Mapper

**Interactive Knowledge Graph Visualization System for Claims, Evidence, and Reasoning Chains**

[![GitHub](https://img.shields.io/github/license/Sakeeb91/claim-mapper)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript)](https://www.typescriptlang.org/)
[![D3.js](https://img.shields.io/badge/D3.js-7.8-orange?logo=d3.js)](https://d3js.org/)

## 🌟 Overview

Claim Mapper is a sophisticated web application that transforms how we visualize, analyze, and collaborate on complex arguments, claims, and evidence. Using interactive knowledge graphs powered by D3.js, users can map relationships between claims, supporting evidence, and reasoning chains in an intuitive, collaborative environment.

### ✨ Key Features

- **📊 Interactive Knowledge Graphs**: Dynamic D3.js visualizations showing relationships between claims, evidence, and reasoning
- **🔍 Advanced Search & Filtering**: Intelligent search with type-based filtering, confidence scoring, and tag-based organization  
- **👥 Real-time Collaboration**: Multi-user editing with live cursors, comments, and version history
- **🧠 AI-Powered Analysis**: Automated claim extraction and reasoning chain generation
- **📱 Mobile-Responsive**: Optimized for desktop, tablet, and mobile devices
- **🔄 Version Control**: Track changes, compare versions, and maintain audit trails
- **🏷️ Smart Tagging**: Automatic and manual categorization of claims by domain and type

## 🏗️ Architecture

### Frontend Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.2
- **Styling**: Tailwind CSS with custom design system
- **Visualization**: D3.js for interactive graph rendering
- **State Management**: Zustand for client state
- **Real-time**: Socket.io client for collaboration
- **Forms**: React Hook Form with Zod validation

### Backend Services
- **API Server**: Express.js with TypeScript
- **WebSocket Server**: Socket.io for real-time features
- **ML Service**: Python with FastAPI for claim analysis
- **Database**: MongoDB for document storage
- **Cache**: Redis for session management and real-time data
- **Authentication**: JWT-based with bcrypt hashing

### Infrastructure
- **Containerization**: Docker with multi-service orchestration
- **Development**: Hot-reload enabled development environment
- **Production**: Nginx reverse proxy with load balancing
- **Monitoring**: Winston logging with structured output

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sakeeb91/claim-mapper.git
   cd claim-mapper
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend/api
   npm install
   ```

4. **Start development environment**
   ```bash
   # From project root
   npm run docker:dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - WebSocket: ws://localhost:8001

### Manual Development Setup

If you prefer running services individually:

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - API Server
cd backend/api
npm run dev

# Terminal 3 - Database (requires Docker)
docker run -d -p 27017:27017 --name mongo mongo:7.0
docker run -d -p 6379:6379 --name redis redis:7.2-alpine
```

## 📁 Project Structure

```
claim-mapper/
├── 📁 src/                          # Frontend source code
│   ├── 📁 app/                      # Next.js App Router pages
│   ├── 📁 components/               # React components
│   │   ├── 📁 ui/                   # Reusable UI components
│   │   ├── 📁 layout/               # Layout components
│   │   ├── 📁 graph/                # D3.js graph components
│   │   ├── 📁 claims/               # Claim management
│   │   ├── 📁 search/               # Search and filtering
│   │   └── 📁 collaboration/        # Real-time collaboration
│   ├── 📁 services/                 # API client services
│   ├── 📁 store/                    # Zustand stores
│   ├── 📁 types/                    # TypeScript definitions
│   ├── 📁 utils/                    # Utility functions
│   └── 📁 hooks/                    # Custom React hooks
├── 📁 backend/                      # Backend services
│   ├── 📁 api/                      # Express.js API server
│   │   ├── 📁 src/
│   │   │   ├── 📁 routes/           # API route handlers
│   │   │   ├── 📁 models/           # Database models
│   │   │   ├── 📁 middleware/       # Express middleware
│   │   │   └── 📁 utils/            # Server utilities
│   │   └── 📄 package.json
│   ├── 📁 websocket/                # Real-time WebSocket server
│   ├── 📁 ml/                       # Python ML services
│   └── 📁 shared/                   # Shared types and utilities
├── 📁 public/                       # Static assets
├── 📄 docker-compose.dev.yml        # Development orchestration
├── 📄 package.json                  # Frontend dependencies
└── 📄 README.md                     # This file
```

## 🎯 Core Features

### 1. Knowledge Graph Visualization

- **Interactive Force-Directed Graphs**: Drag, zoom, and pan through complex claim networks
- **Node Types**: Visual distinction between claims, evidence, and reasoning steps
- **Link Relationships**: Support, contradiction, and neutral evidence connections
- **Filtering**: Hide/show nodes by type, confidence level, or tags
- **Search Integration**: Highlight nodes matching search queries

### 2. Claim Management

- **Claim Types**: Hypotheses, assertions, and questions with confidence scoring
- **Evidence Linking**: Attach supporting, contradicting, or neutral evidence
- **Reasoning Chains**: Step-by-step logical progressions (deductive, inductive, abductive)
- **Source Attribution**: Track original sources and authors
- **Tagging System**: Organize by domain (scientific, political, economic, social)

### 3. Collaborative Editing

- **Real-time Cursors**: See where other users are editing
- **Live Comments**: Contextual discussions on specific claims or evidence
- **Version History**: Track all changes with user attribution
- **Conflict Resolution**: Handle simultaneous edits gracefully
- **Permission Management**: Role-based access (viewer, editor, admin)

### 4. Advanced Search

- **Full-text Search**: Find claims, evidence, and reasoning by content
- **Faceted Filtering**: Filter by type, confidence, date, author, tags
- **Relevance Scoring**: AI-powered ranking of search results
- **Saved Searches**: Bookmark complex filter combinations
- **Export Options**: Download filtered datasets

## 🛠️ Development

### Available Scripts

```bash
# Frontend Development
npm run dev              # Start Next.js development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
npm run format           # Format code with Prettier

# Backend Development
cd backend/api
npm run dev              # Start API development server
npm run build            # Compile TypeScript
npm run test             # Run test suite

# Docker Operations
npm run docker:dev       # Start all services in development
npm run docker:build     # Build all Docker images
docker-compose down      # Stop all services
```

### Technology Decisions

- **Next.js 14**: App Router for improved routing and layouts
- **TypeScript**: Full type safety across frontend and backend
- **Zustand**: Lightweight state management over Redux
- **D3.js**: Unmatched flexibility for custom graph visualizations
- **Tailwind CSS**: Rapid UI development with design consistency
- **MongoDB**: Document-based storage perfect for graph data
- **Socket.io**: Proven real-time communication solution

### Code Style

- **ESLint + Prettier**: Automated code formatting and linting
- **TypeScript Strict Mode**: Maximum type safety enforcement
- **Component Structure**: Functional components with custom hooks
- **Import Organization**: Absolute imports with path mapping
- **Error Boundaries**: Graceful error handling throughout the app

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with tests
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Commit Convention

We use conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/modifications
- `chore:` Maintenance tasks

## 📊 Roadmap

### Phase 1: Core Foundation ✅
- [x] Project setup and architecture
- [x] Basic graph visualization
- [x] Claim and evidence management
- [x] Real-time collaboration foundation

### Phase 2: Enhanced Features 🚧
- [ ] AI-powered claim extraction
- [ ] Advanced reasoning chain analysis  
- [ ] Import/export functionality
- [ ] Mobile app development

### Phase 3: Advanced Analytics 📋
- [ ] Argument strength scoring
- [ ] Bias detection algorithms
- [ ] Network analysis metrics
- [ ] Integration with academic databases

### Phase 4: Enterprise Features 📋
- [ ] Single Sign-On (SSO)
- [ ] Advanced permissions system
- [ ] API rate limiting and quotas
- [ ] White-label deployment options

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **D3.js Community**: For exceptional visualization capabilities
- **Next.js Team**: For the incredible React framework
- **Open Source Contributors**: Who make projects like this possible

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Sakeeb91/claim-mapper/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Sakeeb91/claim-mapper/discussions)
- **Email**: rahman.sakeeb@gmail.com

---

**Built with ❤️ by [Sakeeb Rahman](https://github.com/Sakeeb91)**

*Empowering critical thinking through visual argument analysis*