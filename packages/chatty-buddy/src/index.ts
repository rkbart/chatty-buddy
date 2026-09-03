// Main component
export { RagChatbot } from './component.tsx';

// Types
export type {
  LLMProvider,
  ModelInfo,
  Message,
  ChatOptions,
  VectorStore,
  VectorStoreConfig,
  AddParams,
  QueryParams,
  QueryResult,
  Vector,
  CollectionStats,
  EmbeddingProvider,
  RagChatbotProps,
  RagChatbotConfig,
} from './types.ts';

// Server (for Node.js usage)
export { startEmbeddedServer } from './server/index.ts';
export type { ServerInstance } from './server/index.ts';
export { resolveConfig } from './server/config.ts';

// Providers (for Node.js usage)
export { registry } from './server/services/llm/registry.ts';
export { vectorRegistry } from './server/services/stores/registry.ts';

// Provider implementations (for Node.js usage)
export { NvidiaProvider } from './server/services/llm/nvidia.ts';
export { OllamaProvider } from './server/services/llm/ollama.ts';
export { OpenAIProvider } from './server/services/llm/openai.ts';
export { AnthropicProvider } from './server/services/llm/anthropic.ts';
export { GoogleProvider } from './server/services/llm/google.ts';

// Store implementations (for Node.js usage)
export { ChromaDBStore } from './server/services/stores/chromadb.ts';
export { InMemoryStore } from './server/services/stores/inmemory.ts';
export { SQLiteStore } from './server/services/stores/sqlite.ts';

// Utilities (for Node.js usage)
export { chunkText } from './utils/chunker.ts';
export { parseDocument, isSupportedFile } from './utils/parsers.ts';
export { loadManifest, saveManifest, calculateFileHash, hasFileChanged } from './utils/manifest.ts';
