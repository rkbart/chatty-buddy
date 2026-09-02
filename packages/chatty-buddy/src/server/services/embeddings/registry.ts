import type { EmbeddingProvider } from '../../types.ts';

export class EmbeddingRegistry {
  private providers = new Map<string, EmbeddingProvider>();

  /** Register an embedding provider */
  register(provider: EmbeddingProvider): void {
    this.providers.set(provider.id, provider);
  }

  /** Get provider by ID */
  get(id: string): EmbeddingProvider | undefined {
    return this.providers.get(id);
  }

  /** List all registered providers */
  list(): EmbeddingProvider[] {
    return Array.from(this.providers.values());
  }

  /** Check if provider is registered */
  has(id: string): boolean {
    return this.providers.has(id);
  }
}

/** Singleton registry instance */
export const embeddingRegistry = new EmbeddingRegistry();
