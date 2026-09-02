# Testing Guide

## Overview

Chatty-Buddy uses Vitest for testing with @testing-library/react for component tests.

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test -- tests/providers/nvidia.test.ts
```

## Test Structure

```
tests/
├── setup.ts                 # Test setup
├── providers/               # LLM provider tests
│   ├── nvidia.test.ts
│   ├── ollama.test.ts
│   └── ...
├── stores/                  # Vector store tests
│   ├── inmemory.test.ts
│   └── chromadb.test.ts
└── utils/                   # Utility tests
    ├── chunker.test.ts
    └── manifest.test.ts
```

## Writing Tests

### Basic Test

```typescript
import { describe, it, expect } from 'vitest';
import { MyFunction } from '../src/my-function.ts';

describe('MyFunction', () => {
  it('does something', () => {
    const result = MyFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Testing Providers

```typescript
import { describe, it, expect } from 'vitest';
import { NvidiaProvider } from '../src/server/services/llm/nvidia.ts';

describe('NvidiaProvider', () => {
  it('has correct id', () => {
    const provider = new NvidiaProvider({ apiKey: 'test' });
    expect(provider.id).toBe('nvidia');
  });

  it('requires api key', () => {
    const provider = new NvidiaProvider({ apiKey: 'test' });
    expect(provider.requiresApiKey).toBe(true);
  });

  it('has models', () => {
    const provider = new NvidiaProvider({ apiKey: 'test' });
    expect(provider.models.length).toBeGreaterThan(0);
  });
});
```

### Testing Vector Stores

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStore } from '../src/server/services/stores/inmemory.ts';

describe('InMemoryStore', () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore({ collection: 'test' });
  });

  it('can add and query vectors', async () => {
    await store.init({ collection: 'test' });

    await store.add({
      collection: 'test',
      ids: ['1'],
      embeddings: [[1, 0, 0]],
      documents: ['doc1'],
      metadatas: [{ type: 'test' }],
    });

    const results = await store.query({
      collection: 'test',
      embedding: [1, 0, 0],
      topK: 1,
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });
});
```

### Testing Utilities

```typescript
import { describe, it, expect } from 'vitest';
import { chunkText } from '../src/utils/chunker.ts';

describe('chunkText', () => {
  it('chunks text into pieces', () => {
    const text = 'a'.repeat(1000);
    const chunks = chunkText(text, 'test.txt', 500, 50);

    expect(chunks.length).toBeGreaterThan(1);
  });

  it('creates correct metadata', () => {
    const text = 'Hello world';
    const chunks = chunkText(text, 'test.txt', 10, 2);

    expect(chunks[0].metadata.filename).toBe('test.txt');
  });
});
```

## Test Configuration

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.{ts,tsx}'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

## Mocking

### Mocking Fetch

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('API calls', () => {
  it('fetches data', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    });
    global.fetch = mockFetch;

    const result = await fetchData();
    expect(result).toEqual({ data: 'test' });

    vi.restoreAllMocks();
  });
});
```

### Mocking Dependencies

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('./my-dependency', () => ({
  myFunction: vi.fn().mockReturnValue('mocked'),
}));

import { myFunction } from './my-dependency';

describe('MyModule', () => {
  it('uses mocked dependency', () => {
    const result = myFunction();
    expect(result).toBe('mocked');
  });
});
```

## Coverage

Run coverage with:

```bash
pnpm test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Best Practices

1. Test behavior, not implementation
2. Use descriptive test names
3. Keep tests isolated
4. Mock external dependencies
5. Test edge cases
6. Aim for 80%+ coverage
