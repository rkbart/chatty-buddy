import { describe, it, expect } from 'vitest';
import { NvidiaProvider } from '../../src/server/services/llm/nvidia.ts';

describe('NvidiaProvider', () => {
  it('has correct id and name', () => {
    const provider = new NvidiaProvider({ apiKey: 'test' });
    expect(provider.id).toBe('nvidia');
    expect(provider.name).toBe('NVIDIA/Nemotron');
  });

  it('requires api key', () => {
    const provider = new NvidiaProvider({ apiKey: 'test' });
    expect(provider.requiresApiKey).toBe(true);
  });

  it('is not local', () => {
    const provider = new NvidiaProvider({ apiKey: 'test' });
    expect(provider.isLocal).toBe(false);
  });

  it('has models', () => {
    const provider = new NvidiaProvider({ apiKey: 'test' });
    expect(provider.models.length).toBeGreaterThan(0);
    expect(provider.models[0].id).toBe('meta/llama-3.1-8b-instruct');
  });

  it('supports streaming', () => {
    const provider = new NvidiaProvider({ apiKey: 'test' });
    expect(provider.models[0].supportsStreaming).toBe(true);
  });
});
