import type { LLMProvider } from '../../types.ts';

export class ProviderRegistry {
  private providers = new Map<string, LLMProvider>();

  /** Register a provider */
  register(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  /** Get provider by ID */
  get(id: string): LLMProvider | undefined {
    return this.providers.get(id);
  }

  /** List all registered providers */
  list(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  /** Check if provider is registered */
  has(id: string): boolean {
    return this.providers.has(id);
  }
}

/** Singleton registry instance */
export const registry = new ProviderRegistry();
