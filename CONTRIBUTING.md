# Contributing to Claim Mapper

Thank you for your interest in contributing to Claim Mapper! This document provides guidelines and information for contributors.

## 🤝 Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- Git
- Basic knowledge of TypeScript, React, and Next.js

### Development Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/claim-mapper.git
   cd claim-mapper
   ```

3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/Sakeeb91/claim-mapper.git
   ```

4. Install dependencies:
   ```bash
   npm install
   cd backend/api && npm install
   ```

5. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

6. Start the development environment:
   ```bash
   npm run docker:dev
   ```

## 🐛 Reporting Issues

### Bug Reports
When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/OS information
- Console errors

### Feature Requests
For new features, please provide:
- Clear description of the feature
- Use case and motivation
- Proposed implementation approach
- Any relevant examples or mockups

## 💻 Development Process

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### Commit Messages
We use conventional commits:
```
type(scope): description

feat(graph): add node clustering algorithm
fix(api): handle null values in claim validation
docs(readme): update installation instructions
```

Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure all tests pass

3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add awesome new feature"
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**:
   - Use a clear, descriptive title
   - Fill out the PR template
   - Link any related issues
   - Add screenshots for UI changes

### Code Review Process
- All PRs require review from a maintainer
- Address feedback promptly
- Keep PRs focused and reasonably sized
- Be responsive to questions and suggestions

## 🏗️ Architecture Guidelines

### Frontend (Next.js/React)
- Use functional components with hooks
- Implement TypeScript interfaces for all props
- Follow the established folder structure
- Use Zustand for state management
- Implement error boundaries for robustness

### Backend (Express.js)
- Use TypeScript for type safety
- Implement proper error handling
- Add input validation with Joi
- Write unit tests for business logic
- Follow RESTful API conventions

### Database (MongoDB)
- Use Mongoose for schema validation
- Implement proper indexing
- Follow naming conventions
- Add migration scripts for schema changes

### Styling (Tailwind CSS)
- Use utility classes over custom CSS
- Follow the design system
- Ensure mobile responsiveness
- Test across different browsers

## 🧪 Testing

### Running Tests
```bash
# Frontend tests
npm test

# Backend tests
cd backend/api && npm test

# E2E tests
npm run test:e2e
```

### Writing Tests
- Write unit tests for utility functions
- Add integration tests for API endpoints
- Include component tests for complex UI
- Mock external dependencies appropriately

### Test Coverage
- Aim for >80% code coverage
- Focus on critical business logic
- Test error conditions and edge cases

## 📝 Documentation

### Code Documentation
- Add JSDoc comments for complex functions
- Include type definitions for all interfaces
- Document API endpoints with examples
- Add README files for new modules

### User Documentation
- Update README for new features
- Add screenshots for UI changes
- Include configuration examples
- Write clear setup instructions

## 🎨 Design Guidelines

### UI/UX Principles
- Mobile-first responsive design
- Accessibility compliance (WCAG 2.1)
- Consistent component behavior
- Clear visual hierarchy
- Intuitive navigation patterns

### Visual Design
- Follow the established color palette
- Use consistent spacing and typography
- Maintain visual consistency across pages
- Optimize for performance and load times

## 🚀 Deployment

### Development Environment
- Changes are automatically deployed on push to `develop`
- Preview deployments for all PRs
- Staging environment mirrors production

### Production Deployment
- Releases are tagged and deployed from `main`
- Follow semantic versioning
- Include migration instructions
- Monitor deployment health

## 📚 Resources

### Learning Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [D3.js Documentation](https://d3js.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Project-Specific Guides
- [API Documentation](./docs/api.md)
- [Component Library](./docs/components.md)
- [Database Schema](./docs/database.md)
- [Deployment Guide](./docs/deployment.md)

## ❓ Questions and Support

### Getting Help
- Check existing issues and discussions
- Join our community Discord server
- Reach out to maintainers directly
- Consult the documentation first

### Communication Channels
- GitHub Issues - Bug reports and feature requests
- GitHub Discussions - General questions and ideas
- Discord - Real-time chat and support
- Email - Direct contact with maintainers

## 🏆 Recognition

Contributors will be recognized in:
- The project README
- Release notes for significant contributions
- Annual contributor appreciation posts
- Potential speaking opportunities at conferences

## 📋 Contributor Checklist

Before submitting a PR, ensure:
- [ ] Code follows the style guidelines
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] PR description is clear and complete
- [ ] No merge conflicts exist
- [ ] All CI checks pass

Thank you for contributing to Claim Mapper! 🎉