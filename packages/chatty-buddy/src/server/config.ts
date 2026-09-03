import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { RagChatbotConfig } from '../types.ts';

const CONFIG_FILE = '.chatty-buddy.json';

export function loadConfig(cwd: string = process.cwd()): Partial<RagChatbotConfig> {
  const configPath = join(cwd, CONFIG_FILE);

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`⚠️ Error reading ${CONFIG_FILE}:`, error);
    return {};
  }
}

export function getConfigFromArgs(args: string[]): Partial<RagChatbotConfig> {
  const config: Partial<RagChatbotConfig> = {};

  function getArg(name: string): string | undefined {
    const index = args.indexOf(`--${name}`);
    return index !== -1 ? args[index + 1] : undefined;
  }

  const provider = getArg('provider');
  if (provider) config.provider = provider;

  const apiKey = getArg('api-key');
  if (apiKey) config.apiKey = apiKey;

  const model = getArg('model');
  if (model) config.model = model;

  const vectorStore = getArg('vector-store');
  if (vectorStore) config.vectorStore = vectorStore;

  const documents = getArg('documents');
  if (documents) config.documentsPath = documents;

  const systemPrompt = getArg('system-prompt');
  if (systemPrompt) config.systemPrompt = systemPrompt;

  const temperature = getArg('temperature');
  if (temperature) config.temperature = parseFloat(temperature);

  const maxTokens = getArg('max-tokens');
  if (maxTokens) config.maxTokens = parseInt(maxTokens);

  const port = getArg('port');
  if (port) config.serverPort = parseInt(port);

  const dataDir = getArg('data-dir');
  if (dataDir) config.dataDir = dataDir;

  const embeddingModel = getArg('embedding-model');
  if (embeddingModel) config.embeddingModel = embeddingModel;

  return config;
}

export function getConfigFromEnv(): Partial<RagChatbotConfig> {
  const config: Partial<RagChatbotConfig> = {};

  if (process.env.RAG_PROVIDER) config.provider = process.env.RAG_PROVIDER;
  if (process.env.RAG_API_KEY) config.apiKey = process.env.RAG_API_KEY;
  if (process.env.RAG_MODEL) config.model = process.env.RAG_MODEL;
  if (process.env.RAG_VECTOR_STORE) config.vectorStore = process.env.RAG_VECTOR_STORE;
  if (process.env.RAG_DOCUMENTS_PATH) config.documentsPath = process.env.RAG_DOCUMENTS_PATH;
  if (process.env.RAG_SYSTEM_PROMPT) config.systemPrompt = process.env.RAG_SYSTEM_PROMPT;
  if (process.env.RAG_TEMPERATURE) config.temperature = parseFloat(process.env.RAG_TEMPERATURE);
  if (process.env.RAG_MAX_TOKENS) config.maxTokens = parseInt(process.env.RAG_MAX_TOKENS);
  if (process.env.RAG_SERVER_PORT) config.serverPort = parseInt(process.env.RAG_SERVER_PORT);
  if (process.env.RAG_DATA_DIR) config.dataDir = process.env.RAG_DATA_DIR;
  if (process.env.RAG_EMBEDDING_MODEL) config.embeddingModel = process.env.RAG_EMBEDDING_MODEL;

  return config;
}

export function resolveConfig(args: string[]): RagChatbotConfig {
  // Priority: CLI args > env vars > config file > defaults
  const fileConfig = loadConfig();
  const envConfig = getConfigFromEnv();
  const argsConfig = getConfigFromArgs(args);

  return {
    // Defaults
    provider: 'nvidia',
    model: 'meta/llama-3.2-11b-vision-instruct',
    vectorStore: 'sqlite',
    documentsPath: './docs',
    temperature: 0.7,
    maxTokens: 1024,
    serverPort: 3000,
    dataDir: './.chatty-buddy',
    // Override with file config
    ...fileConfig,
    // Override with env config
    ...envConfig,
    // Override with args config (highest priority)
    ...argsConfig,
  };
}
