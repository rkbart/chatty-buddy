# Architecture

## Overview

Chatty-Buddy is a React component library that provides RAG (Retrieval-Augmented Generation) chatbot functionality. It includes an embedded Express server, multiple LLM providers, and pluggable vector stores.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                        │
├─────────────────────────────────────────────────────────────┤
│                    <RagChatbot />                           │
├─────────────────────────────────────────────────────────────┤
│                    Embedded Server                          │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │  Chat API   │  Documents  │   Config    │  Health     │  │
│  │   /api/chat │  /api/docs  │ /api/config │  /health    │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Services                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              LLM Providers                          │   │
│  │  ┌─────────┬─────────┬─────────┬─────────┬────────┐│   │
│  │  │ NVIDIA  │ Ollama  │ OpenAI  │Anthropic│ Google ││   │
│  │  └─────────┴─────────┴─────────┴─────────┴────────┘│   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Vector Stores                          │   │
│  │  ┌─────────────┬─────────────┬─────────────┐       │   │
│  │  │  ChromaDB   │   Qdrant    │  In-Memory  │       │   │
│  │  └─────────────┴─────────────┴─────────────┘       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Document Processing                    │   │
│  │  ┌─────────┬─────────┬─────────┬─────────┐         │   │
│  │  │  PDF    │  DOCX   │   TXT   │   MD    │         │   │
│  │  └─────────┴─────────┴─────────┴─────────┘         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Document Ingestion

```
Document Folder
      │
      ▼
┌─────────────────┐
│  Scan Files     │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Parse Document │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Chunk Text     │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Generate       │
│  Embeddings     │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Store in       │
│  Vector DB      │
└─────────────────┘
```

### 2. Chat Query

```
User Message
      │
      ▼
┌─────────────────┐
│  Embed Query    │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Search Vector  │
│  Store          │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Build Context  │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Send to LLM    │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Stream Response│
└─────────────────┘
```

## Key Components

### LLM Providers

Each provider implements the `LLMProvider` interface:

```typescript
interface LLMProvider {
  id: string;
  name: string;
  models: ModelInfo[];
  requiresApiKey: boolean;
  isLocal: boolean;
  chat(messages: Message[], options: ChatOptions): AsyncGenerator<string>;
  embed?(texts: string[]): Promise<number[][]>;
}
```

### Vector Stores

Each store implements the `VectorStore` interface:

```typescript
interface VectorStore {
  id: string;
  name: string;
  isLocal: boolean;
  isPersistent: boolean;
  init(config: VectorStoreConfig): Promise<void>;
  add(params: AddParams): Promise<void>;
  query(params: QueryParams): Promise<QueryResult[]>;
  delete(ids: string[]): Promise<void>;
  clear(collection: string): Promise<void>;
  stats(collection: string): Promise<CollectionStats>;
  destroy(): Promise<void>;
}
```

### Registries

Registries allow custom providers and stores to be registered:

```typescript
// Register custom provider
registry.register(new MyCustomProvider());

// Register custom vector store
vectorRegistry.register({
  id: 'my-store',
  name: 'My Custom Store',
  create: (config) => new MyCustomStore(config),
});
```

## File Structure

```
packages/chatty-buddy/
├── src/
│   ├── index.ts              # Main exports
│   ├── component.tsx         # React component
│   ├── styles.css            # Component styles
│   ├── types.ts              # TypeScript types
│   ├── server/
│   │   ├── index.ts          # Embedded server
│   │   ├── routes/
│   │   │   ├── chat.ts       # Chat endpoint
│   │   │   ├── documents.ts  # Document management
│   │   │   └── config.ts     # Configuration
│   │   └── services/
│   │       ├── llm/          # LLM providers
│   │       ├── stores/       # Vector stores
│   │       └── embeddings/   # Embedding providers
│   └── utils/
│       ├── chunker.ts        # Text chunking
│       ├── parsers.ts        # Document parsing
│       └── manifest.ts       # Ingestion tracking
└── tests/                    # Test files
```

## Extensibility

### Adding Custom Providers

1. Implement `LLMProvider` interface
2. Register with `registry.register()`
3. Use in component: `<RagChatbot provider="my-provider" />`

### Adding Custom Vector Stores

1. Implement `VectorStore` interface
2. Register with `vectorRegistry.register()`
3. Use in component: `<RagChatbot vectorStore="my-store" />`
