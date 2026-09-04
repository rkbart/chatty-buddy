import { startEmbeddedServer } from '../src/server/index.ts';
import { registry } from '../src/server/services/llm/registry.ts';
import { vectorRegistry } from '../src/server/services/stores/registry.ts';
import { resolveConfig } from '../src/server/config.ts';
import { NvidiaProvider } from '../src/server/services/llm/nvidia.ts';
import { OllamaProvider } from '../src/server/services/llm/ollama.ts';
import { OpenAIProvider } from '../src/server/services/llm/openai.ts';
import { AnthropicProvider } from '../src/server/services/llm/anthropic.ts';
import { GoogleProvider } from '../src/server/services/llm/google.ts';
import { SQLiteStore } from '../src/server/services/stores/sqlite.ts';

// Resolve configuration from args, env, file, and defaults
const config = resolveConfig(process.argv.slice(2));

// Register providers
switch (config.provider) {
  case 'nvidia':
    if (config.apiKey) {
      registry.register(new NvidiaProvider({
        apiKey: config.apiKey,
        model: config.model,
        embeddingModel: config.embeddingModel,
      }));
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

// Register SQLite as default vector store
vectorRegistry.register({
  id: 'sqlite',
  name: 'SQLite',
  create: (cfg) => new SQLiteStore(cfg),
});

// Lazy-load ChromaDB only if requested
if (config.vectorStore === 'chromadb') {
  const { ChromaDBStore } = await import('../src/server/services/stores/chromadb.ts');
  vectorRegistry.register({
    id: 'chromadb',
    name: 'ChromaDB',
    create: (cfg) => new ChromaDBStore(cfg),
  });
}

// Start server
console.log('🚀 Starting Chatty-Buddy server...');
console.log(`   Provider: ${config.provider}`);
console.log(`   Model: ${config.model}`);
console.log(`   Vector Store: ${config.vectorStore}`);
console.log(`   Documents: ${config.documentsPath}`);
console.log(`   Database: ${config.dataDir}`);

const server = await startEmbeddedServer(config);

console.log(`✅ Server running on http://localhost:${server.port}`);
console.log('   Press Ctrl+C to stop');

// Handle shutdown
const shutdown = async () => {
  console.log('\n🛑 Shutting down...');
  await server.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// Ignore SIGHUP (sent when terminal closes) — keep running in background
process.on('SIGHUP', () => {});
