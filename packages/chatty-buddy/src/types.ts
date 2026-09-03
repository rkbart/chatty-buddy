// LLM Provider Types
export interface LLMProvider {
  /** Unique provider identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Supported models */
  models: ModelInfo[];

  /** Whether API key is required */
  requiresApiKey: boolean;

  /** Whether this provider runs locally */
  isLocal: boolean;

  /** Generate chat completion (streaming) */
  chat(messages: Message[], options: ChatOptions): AsyncGenerator<string>;

  /** Generate embeddings (optional) */
  embed?(texts: string[]): Promise<number[][]>;
}

export interface ModelInfo {
  id: string;
  name: string;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsEmbeddings: boolean;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

// Vector Store Types
export interface VectorStore {
  /** Unique store identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Whether this runs locally or requires external service */
  isLocal: boolean;

  /** Whether this is persistent or in-memory */
  isPersistent: boolean;

  /** Initialize the store */
  init(config: VectorStoreConfig): Promise<void>;

  /** Add vectors with metadata */
  add(params: AddParams): Promise<void>;

  /** Query similar vectors */
  query(params: QueryParams): Promise<QueryResult[]>;

  /** Delete vectors by ID */
  delete(ids: string[]): Promise<void>;

  /** Clear entire collection */
  clear(collection: string): Promise<void>;

  /** Get collection stats */
  stats(collection: string): Promise<CollectionStats>;

  /** Cleanup resources */
  destroy(): Promise<void>;

  /** Save document record (for stores with FOREIGN KEY constraints) */
  saveDocument?(filename: string, hash: string, chunkCount: number, fileSize: number): void;
}

export interface VectorStoreConfig {
  /** Storage path (for local stores) */
  path?: string;

  /** Connection URL (for remote stores) */
  url?: string;

  /** API key (for managed stores) */
  apiKey?: string;

  /** Collection/table name */
  collection?: string;

  /** Dimension of embeddings */
  dimension?: number;

  /** Additional provider-specific options */
  options?: Record<string, unknown>;
}

export interface AddParams {
  collection: string;
  ids: string[];
  embeddings: number[][];
  documents: string[];
  metadatas: Record<string, unknown>[];
}

export interface QueryParams {
  collection: string;
  embedding: number[];
  topK: number;
  filter?: Record<string, unknown>;
}

export interface QueryResult {
  id: string;
  document: string;
  metadata: Record<string, unknown>;
  distance: number;
}

export interface Vector {
  id: string;
  embedding: number[];
  document: string;
  metadata: Record<string, unknown>;
}

export interface CollectionStats {
  count: number;
  collection: string;
}

// Embedding Types
export interface EmbeddingProvider {
  id: string;
  name: string;
  embed(texts: string[]): Promise<number[][]>;
}

// Component Types
export interface RagChatbotProps {
  /** Backend API URL (default: http://localhost:3000) */
  apiUrl?: string;

  /** Widget position */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'full';

  /** Theme */
  theme?: 'light' | 'dark';

  /** Chat title */
  title?: string;

  /** Primary accent color */
  primaryColor?: string;

  /** Input placeholder text */
  placeholder?: string;

  /** Additional CSS class name */
  className?: string;

  /** Additional inline styles */
  style?: React.CSSProperties;

  /** Callback when assistant responds */
  onMessage?: (message: Message) => void;
}

// Server Configuration
export interface RagChatbotConfig {
  provider: string;
  apiKey?: string;
  model?: string;
  vectorStore?: string;
  vectorStoreConfig?: VectorStoreConfig;
  documentsPath: string;
  embeddingProvider?: string;
  embeddingModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  topK?: number;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  serverPort?: number;
  dataDir?: string;
}
