# Claim Mapper Documentation

Welcome to the Claim Mapper documentation! This directory contains comprehensive guides and references for working with the codebase.

## 📚 Documentation Structure

### Guides
Practical how-to guides for common tasks:
- **[Testing Guide](./guides/testing.md)** - Comprehensive testing strategy and commands
- **[Search Implementation](./guides/search.md)** - Search system architecture and usage

### Features
In-depth feature documentation:
- **[Reasoning Flow Visualization](./features/reasoning-flow-visualization.md)** - Reasoning chain graph visualization

### Architecture
Deep dives into system design and components:
- **[ML Service Overview](./architecture/ml-service.md)** - ML service capabilities and API
- **[Reasoning Features](./architecture/reasoning-features.md)** - Advanced reasoning engine details
- **[ML Implementation](./architecture/ml-implementation.md)** - ML service implementation summary

### Troubleshooting
Solutions to common problems:
- **[CI/CD Fixes](./troubleshooting/ci-fixes.md)** - CI pipeline issue resolutions

## 🚀 Quick Links

### Getting Started
- [Main README](../README.md) - Project overview and quick start
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute
- [CLAUDE.md](../CLAUDE.md) - AI assistant development guide

### Development
- [Testing](./guides/testing.md) - Run tests across all services
- [Docker Setup](../docker-compose.dev.yml) - Multi-service development environment

### API Reference
- Frontend API client: `src/services/api.ts`
- Backend API routes: `backend/api/src/routes/`
- ML Service endpoints: `backend/ml/main.py`

## 📖 Additional Resources

### External Documentation
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [D3.js API Reference](https://d3js.org/api)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Socket.io Documentation](https://socket.io/docs/)

### Code Organization
- Frontend: `/src` directory
- Backend API: `/backend/api` directory
- ML Service: `/backend/ml` directory
- Shared types: `/src/types`
- Constants: `/src/constants` and `/backend/api/src/constants`

## 🤝 Contributing to Documentation

When adding new documentation:
1. Place guides in `docs/guides/`
2. Place architecture docs in `docs/architecture/`
3. Place troubleshooting in `docs/troubleshooting/`
4. Update this README with links
5. Use clear headings and examples
6. Include code snippets where helpful

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Sakeeb91/claim-mapper/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Sakeeb91/claim-mapper/discussions)
- **Email**: rahman.sakeeb@gmail.com
