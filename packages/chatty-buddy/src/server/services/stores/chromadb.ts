import type { VectorStore, VectorStoreConfig, AddParams, QueryParams, QueryResult, CollectionStats } from '../../types.ts';

export class ChromaDBStore implements VectorStore {
  id = 'chromadb';
  name = 'ChromaDB';
  isLocal = true;
  isPersistent = true;

  private client: any;
  private collection: any = null;

  constructor(config: VectorStoreConfig) {
    this.config = config;
  }

  private config: VectorStoreConfig;

  private async getClient() {
    if (!this.client) {
      const { ChromaClient } = await import('chromadb');
      this.client = new ChromaClient({
        path: this.config.path || './.rag-chatbot/chroma',
      });
    }
    return this.client;
  }

  async init(config: VectorStoreConfig): Promise<void> {
    const client = await this.getClient();
    this.collection = await client.getOrCreateCollection({
      name: config.collection || 'documents',
      metadata: { 'hnsw:space': 'cosine' },
    });
  }

  async add(params: AddParams): Promise<void> {
    if (!this.collection) {
      throw new Error('Store not initialized. Call init() first.');
    }

    await this.collection.add({
      ids: params.ids,
      embeddings: params.embeddings,
      documents: params.documents,
      metadatas: params.metadatas as Record<string, string | number | boolean>[],
    });
  }

  async query(params: QueryParams): Promise<QueryResult[]> {
    if (!this.collection) {
      throw new Error('Store not initialized. Call init() first.');
    }

    const results = await this.collection.query({
      queryEmbeddings: [params.embedding],
      nResults: params.topK,
      where: params.filter as Record<string, string | number | boolean> | undefined,
    });

    if (!results.ids[0]) return [];

    return results.ids[0].map((id: string, i: number) => ({
      id,
      document: results.documents[0]?.[i] || '',
      metadata: (results.metadatas[0]?.[i] as Record<string, unknown>) || {},
      distance: results.distances[0]?.[i] || 0,
    }));
  }

  async delete(ids: string[]): Promise<void> {
    if (!this.collection) {
      throw new Error('Store not initialized. Call init() first.');
    }

    await this.collection.delete({ ids });
  }

  async clear(collection: string): Promise<void> {
    const client = await this.getClient();
    await client.deleteCollection({ name: collection });
  }

  async stats(collection: string): Promise<CollectionStats> {
    const client = await this.getClient();
    const col = await client.getCollection({ name: collection });
    return { count: await col.count(), collection };
  }

  async destroy(): Promise<void> {
    this.collection = null;
  }
}
