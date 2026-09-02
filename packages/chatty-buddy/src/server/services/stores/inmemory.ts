import type { VectorStore, VectorStoreConfig, AddParams, QueryParams, QueryResult, CollectionStats, Vector } from '../../types.ts';

export class InMemoryStore implements VectorStore {
  id = 'inmemory';
  name = 'In-Memory';
  isLocal = true;
  isPersistent = false;

  private collections = new Map<string, Vector[]>();

  async init(_config: VectorStoreConfig): Promise<void> {
    // In-memory store doesn't need initialization
  }

  async add(params: AddParams): Promise<void> {
    const collection = this.collections.get(params.collection) || [];

    params.ids.forEach((id, i) => {
      collection.push({
        id,
        embedding: params.embeddings[i],
        document: params.documents[i],
        metadata: params.metadatas[i],
      });
    });

    this.collections.set(params.collection, collection);
  }

  async query(params: QueryParams): Promise<QueryResult[]> {
    const collection = this.collections.get(params.collection) || [];

    return collection
      .map((v) => ({
        id: v.id,
        document: v.document,
        metadata: v.metadata,
        distance: this.cosineSimilarity(params.embedding, v.embedding),
      }))
      .sort((a, b) => b.distance - a.distance)
      .slice(0, params.topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    const denominator = Math.sqrt(magA) * Math.sqrt(magB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  async delete(ids: string[]): Promise<void> {
    for (const [name, vectors] of this.collections) {
      this.collections.set(
        name,
        vectors.filter((v) => !ids.includes(v.id))
      );
    }
  }

  async clear(collection: string): Promise<void> {
    this.collections.set(collection, []);
  }

  async stats(collection: string): Promise<CollectionStats> {
    return {
      count: this.collections.get(collection)?.length || 0,
      collection,
    };
  }

  async destroy(): Promise<void> {
    this.collections.clear();
  }
}
