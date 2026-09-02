import type { VectorStore, VectorStoreConfig } from '../../types.ts';

export interface VectorStoreFactory {
  id: string;
  name: string;
  create(config: VectorStoreConfig): VectorStore;
}

export class VectorStoreRegistry {
  private stores = new Map<string, VectorStoreFactory>();

  /** Register a vector store factory */
  register(factory: VectorStoreFactory): void {
    this.stores.set(factory.id, factory);
  }

  /** Create a new store instance */
  create(id: string, config: VectorStoreConfig): VectorStore {
    const factory = this.stores.get(id);
    if (!factory) {
      throw new Error(`Unknown vector store: ${id}`);
    }
    return factory.create(config);
  }

  /** List available stores */
  list(): VectorStoreFactory[] {
    return Array.from(this.stores.values());
  }

  /** Check if store is registered */
  has(id: string): boolean {
    return this.stores.has(id);
  }
}

/** Singleton registry instance */
export const vectorRegistry = new VectorStoreRegistry();
