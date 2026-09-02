import { describe, it, expect } from 'vitest';
import { OllamaProvider } from '../../src/server/services/llm/ollama.ts';

describe('OllamaProvider', () => {
  it('has correct id and name', () => {
    const provider = new OllamaProvider({});
    expect(provider.id).toBe('ollama');
    expect(provider.name).toBe('Ollama (Local)');
  });

  it('does not require api key', () => {
    const provider = new OllamaProvider({});
    expect(provider.requiresApiKey).toBe(false);
  });

  it('is local', () => {
    const provider = new OllamaProvider({});
    expect(provider.isLocal).toBe(true);
  });

  it('has models', () => {
    const provider = new OllamaProvider({});
    expect(provider.models.length).toBeGreaterThan(0);
    expect(provider.models[0].id).toBe('llama3.1');
  });

  it('supports embeddings', () => {
    const provider = new OllamaProvider({});
    expect(provider.models[0].supportsEmbeddings).toBe(true);
  });

  it('uses custom base url', () => {
    const provider = new OllamaProvider({ baseUrl: 'http://custom:11434' });
    expect(provider['baseUrl']).toBe('http://custom:11434');
  });
});
