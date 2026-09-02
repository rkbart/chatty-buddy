import { startEmbeddedServer } from './server/index.ts';
import { registry } from './server/services/llm/registry.ts';
import { vectorRegistry } from './server/services/stores/registry.ts';
import { NvidiaProvider } from './server/services/llm/nvidia.ts';
import { OllamaProvider } from './server/services/llm/ollama.ts';
import { OpenAIProvider } from './server/services/llm/openai.ts';
import { AnthropicProvider } from './server/services/llm/anthropic.ts';
import { GoogleProvider } from './server/services/llm/google.ts';
import { ChromaDBStore } from './server/services/stores/chromadb.ts';
import { InMemoryStore } from './server/services/stores/inmemory.ts';
import type { RagChatbotConfig } from './types.ts';

// Register built-in providers
function registerProviders(config: RagChatbotConfig) {
  switch (config.provider) {
    case 'nvidia':
      if (config.apiKey) {
        registry.register(new NvidiaProvider({ apiKey: config.apiKey, model: config.model }));
      }
      break;
    case 'ollama':
      registry.register(new OllamaProvider({ model: config.model }));
      break;
    case 'openai':
      if (config.apiKey) {
        registry.register(new OpenAIProvider({ apiKey: config.apiKey, model: config.model }));
      }
      break;
    case 'anthropic':
      if (config.apiKey) {
        registry.register(new AnthropicProvider({ apiKey: config.apiKey, model: config.model }));
      }
      break;
    case 'google':
      if (config.apiKey) {
        registry.register(new GoogleProvider({ apiKey: config.apiKey, model: config.model }));
      }
      break;
  }
}

// Register built-in vector stores
function registerStores() {
  if (!vectorRegistry.has('chromadb')) {
    vectorRegistry.register({
      id: 'chromadb',
      name: 'ChromaDB',
      create: (config) => new ChromaDBStore(config),
    });
  }
  if (!vectorRegistry.has('inmemory')) {
    vectorRegistry.register({
      id: 'inmemory',
      name: 'In-Memory',
      create: (config) => new InMemoryStore(config),
    });
  }
}

// Main function
async function main() {
  // Get config from environment or command line
  const config: RagChatbotConfig = {
    provider: process.env.RAG_PROVIDER || 'ollama',
    apiKey: process.env.RAG_API_KEY,
    model: process.env.RAG_MODEL,
    vectorStore: process.env.RAG_VECTOR_STORE || 'chromadb',
    documentsPath: process.env.RAG_DOCUMENTS_PATH || './docs',
    systemPrompt: process.env.RAG_SYSTEM_PROMPT,
    temperature: process.env.RAG_TEMPERATURE ? parseFloat(process.env.RAG_TEMPERATURE) : 0.7,
    maxTokens: process.env.RAG_MAX_TOKENS ? parseInt(process.env.RAG_MAX_TOKENS) : 1024,
    serverPort: process.env.RAG_SERVER_PORT ? parseInt(process.env.RAG_SERVER_PORT) : 3000,
    dataDir: process.env.RAG_DATA_DIR || './.rag-chatbot',
  };

  console.log('🚀 Starting Chatty-Buddy server...');
  console.log(`   Provider: ${config.provider}`);
  console.log(`   Vector Store: ${config.vectorStore}`);
  console.log(`   Documents: ${config.documentsPath}`);

  // Register providers and stores
  registerProviders(config);
  registerStores();

  // Start server
  const server = await startEmbeddedServer(config);

  console.log(`✅ Server running on http://localhost:${server.port}`);
  console.log('   Press Ctrl+C to stop');

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down...');
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
