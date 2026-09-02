# Development Guide

## Prerequisites

- Node.js 18+
- pnpm 9+

## Setup

```bash
# Clone the repository
git clone https://github.com/your-username/chatty-buddy.git
cd chatty-buddy

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build
```

## Project Structure

```
chatty-buddy/
├── packages/
│   └── chatty-buddy/        # Main library
│       ├── src/             # Source code
│       └── tests/           # Tests
├── docs/                    # Documentation
├── package.json             # Root package
└── pnpm-workspace.yaml      # Workspace config
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run typecheck
pnpm typecheck

# Run linter
pnpm lint

# Fix lint issues
pnpm lint:fix

# Build library
pnpm build

# Clean build artifacts
pnpm clean
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- tests/providers/nvidia.test.ts

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

### Writing Tests

Tests are located in `tests/` directory and follow the pattern:
- `tests/providers/` - LLM provider tests
- `tests/stores/` - Vector store tests
- `tests/utils/` - Utility function tests

Example test:

```typescript
import { describe, it, expect } from 'vitest';
import { MyProvider } from '../../src/server/services/llm/my-provider.ts';

describe('MyProvider', () => {
  it('has correct id', () => {
    const provider = new MyProvider({ apiKey: 'test' });
    expect(provider.id).toBe('my-provider');
  });
});
```

## Code Style

- Use TypeScript
- Follow existing patterns
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use meaningful variable names

## Git Workflow

1. Create a branch from `main`
2. Make your changes
3. Run tests and typecheck
4. Commit with descriptive message
5. Push and create PR

### Commit Messages

Use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring

## Adding New Features

### Adding a Provider

1. Create file in `src/server/services/llm/`
2. Implement `LLMProvider` interface
3. Add tests in `tests/providers/`
4. Update documentation

### Adding a Vector Store

1. Create file in `src/server/services/stores/`
2. Implement `VectorStore` interface
3. Add tests in `tests/stores/`
4. Update documentation

## Debugging

### Server Issues

The embedded server runs on a random port. Check console logs for:
- Server start: `Server running on port XXXX`
- Errors: `Chat error: ...`

### Document Ingestion

Check the manifest file at `.rag-chatbot/manifest.json` for ingestion status.

## Performance

- Use In-Memory store for testing
- ChromaDB is recommended for development
- Consider Qdrant for production use
