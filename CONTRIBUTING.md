# Contributing to Chatty-Buddy

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/chatty-buddy.git
cd chatty-buddy

# Install dependencies
pnpm install

# Run tests
pnpm test
```

## Development Workflow

### Making Changes

1. Create a branch from `main`
2. Make your changes
3. Run tests: `pnpm test`
4. Run typecheck: `pnpm typecheck`
5. Run linter: `pnpm lint`
6. Submit a pull request

### Code Style

- Use TypeScript
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for 80%+ code coverage

## Adding a New Provider

1. Create a new file in `src/server/services/llm/`
2. Implement the `LLMProvider` interface
3. Register the provider in the registry
4. Add tests in `tests/providers/`
5. Update documentation

## Adding a New Vector Store

1. Create a new file in `src/server/services/stores/`
2. Implement the `VectorStore` interface
3. Register the store in the registry
4. Add tests in `tests/stores/`
5. Update documentation

## Pull Request Guidelines

- Keep PRs focused on a single change
- Write clear commit messages
- Add tests for new functionality
- Update documentation if needed
- Ensure CI passes

## Reporting Issues

- Use GitHub Issues
- Include reproduction steps
- Include expected vs actual behavior
- Include environment details

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
