#!/usr/bin/env node

import { startEmbeddedServer } from '../src/server/index.ts';
import { registry } from '../src/server/services/llm/registry.ts';
import { vectorRegistry } from '../src/server/services/stores/registry.ts';
import { NvidiaProvider } from '../src/server/services/llm/nvidia.ts';
import { OllamaProvider } from '../src/server/services/llm/ollama.ts';
import { OpenAIProvider } from '../src/server/services/llm/openai.ts';
import { AnthropicProvider } from '../src/server/services/llm/anthropic.ts';
import { GoogleProvider } from '../src/server/services/llm/google.ts';
import { ChromaDBStore } from '../src/server/services/stores/chromadb.ts';
import { InMemoryStore } from '../src/server/services/stores/inmemory.ts';

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  provider: getArg('provider') || process.env.RAG_PROVIDER || 'nvidia',
  apiKey: getArg('api-key') || process.env.RAG_API_KEY || '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',
  model: getArg('model') || process.env.RAG_MODEL || 'meta/llama-3.2-11b-vision-instruct',
  vectorStore: getArg('vector-store') || process.env.RAG_VECTOR_STORE || 'inmemory',
  documentsPath: getArg('documents') || process.env.RAG_DOCUMENTS_PATH || './docs',
  systemPrompt: getArg('system-prompt') || process.env.RAG_SYSTEM_PROMPT,
  temperature: parseFloat(getArg('temperature') || process.env.RAG_TEMPERATURE || '0.7'),
  maxTokens: parseInt(getArg('max-tokens') || process.env.RAG_MAX_TOKENS || '1024'),
  serverPort: parseInt(getArg('port') || process.env.RAG_SERVER_PORT || '3000'),
  dataDir: getArg('data-dir') || process.env.RAG_DATA_DIR || './.rag-chatbot',
};

function getArg(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  return index !== -1 ? args[index + 1] : undefined;
}

// Register providers
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

// Register vector stores
vectorRegistry.register({
  id: 'chromadb',
  name: 'ChromaDB',
  create: (cfg) => new ChromaDBStore(cfg),
});

vectorRegistry.register({
  id: 'inmemory',
  name: 'In-Memory',
  create: (cfg) => new InMemoryStore(cfg),
});

// Start server
console.log('🚀 Starting Chatty-Buddy server...');
console.log(`   Provider: ${config.provider}`);
console.log(`   Vector Store: ${config.vectorStore}`);
console.log(`   Documents: ${config.documentsPath}`);

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
