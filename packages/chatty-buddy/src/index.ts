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

// Server
export { startEmbeddedServer } from './server/index.ts';

// Providers
export { registry } from './server/services/llm/registry.ts';
export { vectorRegistry } from './server/services/stores/registry.ts';

// Provider implementations
export { NvidiaProvider } from './server/services/llm/nvidia.ts';
export { OllamaProvider } from './server/services/llm/ollama.ts';
export { OpenAIProvider } from './server/services/llm/openai.ts';
export { AnthropicProvider } from './server/services/llm/anthropic.ts';
export { GoogleProvider } from './server/services/llm/google.ts';

// Store implementations
export { ChromaDBStore } from './server/services/stores/chromadb.ts';
export { InMemoryStore } from './server/services/stores/inmemory.ts';

// Utilities
export { chunkText } from './utils/chunker.ts';
export { parseDocument } from './utils/parsers.ts';
export { loadManifest, saveManifest, calculateFileHash, hasFileChanged } from './utils/manifest.ts';
