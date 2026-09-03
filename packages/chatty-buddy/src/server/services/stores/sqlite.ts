import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import type { VectorStore, VectorStoreConfig, AddParams, QueryParams, QueryResult, CollectionStats } from '../../types.ts';

export class SQLiteStore implements VectorStore {
  id = 'sqlite';
  name = 'SQLite';
  isLocal = true;
  isPersistent = true;

  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(config: VectorStoreConfig) {
    this.dbPath = config.path || './.chatty-buddy/data.db';
  }

  async init(_config: VectorStoreConfig): Promise<void> {
    if (this.db) return;

    // Ensure directory exists
    mkdirSync(dirname(this.dbPath), { recursive: true });

    this.db = new Database(this.dbPath);

    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        filename TEXT PRIMARY KEY,
        hash TEXT NOT NULL,
        ingested_at TEXT NOT NULL,
        chunk_count INTEGER NOT NULL,
        file_size INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB NOT NULL,
        metadata TEXT,
        FOREIGN KEY (filename) REFERENCES documents(filename) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_chunks_filename ON chunks(filename);
    `);
  }

  async add(params: AddParams): Promise<void> {
    if (!this.db) throw new Error('Store not initialized. Call init() first.');

    const insertChunk = this.db.prepare(`
      INSERT OR REPLACE INTO chunks (id, filename, chunk_index, content, embedding, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((items: Array<{
      id: string;
      filename: string;
      chunkIndex: number;
      content: string;
      embedding: Buffer;
      metadata: string;
    }>) => {
      for (const item of items) {
        insertChunk.run(
          item.id,
          item.filename,
          item.chunkIndex,
          item.content,
          item.embedding,
          item.metadata
        );
      }
    });

    const items = params.ids.map((id, i) => ({
      id,
      filename: (params.metadatas[i]?.filename as string) || 'unknown',
      chunkIndex: (params.metadatas[i]?.chunkIndex as number) || i,
      content: params.documents[i],
      embedding: this.float32ToBuffer(params.embeddings[i]),
      metadata: JSON.stringify(params.metadatas[i]),
    }));

    insertMany(items);
  }

  async query(params: QueryParams): Promise<QueryResult[]> {
    if (!this.db) throw new Error('Store not initialized. Call init() first.');

    // Get all chunks for the collection (filtered by filename if provided)
    let rows: Array<{
      id: string;
      content: string;
      embedding: Buffer;
      metadata: string;
      filename: string;
    }>;

    if (params.filter?.filename) {
      rows = this.db.prepare(`
        SELECT id, content, embedding, metadata, filename
        FROM chunks
        WHERE filename = ?
      `).all(params.filter.filename as string) as typeof rows;
    } else {
      rows = this.db.prepare(`
        SELECT id, content, embedding, metadata, filename
        FROM chunks
      `).all() as typeof rows;
    }

    // Compute cosine similarity and sort
    const results: QueryResult[] = rows.map((row) => ({
      id: row.id,
      document: row.content,
      metadata: JSON.parse(row.metadata || '{}'),
      distance: this.cosineSimilarity(params.embedding, this.bufferToFloat32(row.embedding)),
    }));

    results.sort((a, b) => b.distance - a.distance);

    return results.slice(0, params.topK);
  }

  async deleteByDocument(filename: string): Promise<void> {
    if (!this.db) throw new Error('Store not initialized. Call init() first.');
    this.db.prepare('DELETE FROM chunks WHERE filename = ?').run(filename);
    this.db.prepare('DELETE FROM documents WHERE filename = ?').run(filename);
  }

  async delete(ids: string[]): Promise<void> {
    if (!this.db) throw new Error('Store not initialized. Call init() first.');

    const deleteMany = this.db.transaction((deleteIds: string[]) => {
      const stmt = this.db!.prepare('DELETE FROM chunks WHERE id = ?');
      for (const id of deleteIds) {
        stmt.run(id);
      }
    });

    deleteMany(ids);
  }

  async clear(collection: string): Promise<void> {
    if (!this.db) throw new Error('Store not initialized. Call init() first.');
    this.db.prepare('DELETE FROM chunks').run();
    this.db.prepare('DELETE FROM documents').run();
  }

  async stats(_collection: string): Promise<CollectionStats> {
    if (!this.db) throw new Error('Store not initialized. Call init() first.');

    const result = this.db.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number };
    return {
      count: result.count,
      collection: 'documents',
    };
  }

  async destroy(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // Document management
  getDocument(filename: string): { hash: string; chunkCount: number } | null {
    if (!this.db) return null;
    return this.db.prepare('SELECT hash, chunk_count as chunkCount FROM documents WHERE filename = ?')
      .get(filename) as { hash: string; chunkCount: number } | null;
  }

  saveDocument(filename: string, hash: string, chunkCount: number, fileSize: number): void {
    if (!this.db) return;
    this.db.prepare(`
      INSERT OR REPLACE INTO documents (filename, hash, ingested_at, chunk_count, file_size)
      VALUES (?, ?, ?, ?, ?)
    `).run(filename, hash, new Date().toISOString(), chunkCount, fileSize);
  }

  deleteDocument(filename: string): void {
    if (!this.db) return;
    this.db.prepare('DELETE FROM chunks WHERE filename = ?').run(filename);
    this.db.prepare('DELETE FROM documents WHERE filename = ?').run(filename);
  }

  getAllDocuments(): Array<{ filename: string; hash: string; chunkCount: number }> {
    if (!this.db) return [];
    return this.db.prepare('SELECT filename, hash, chunk_count as chunkCount FROM documents')
      .all() as Array<{ filename: string; hash: string; chunkCount: number }>;
  }

  // Helper methods
  private float32ToBuffer(arr: number[]): Buffer {
    const float32 = new Float32Array(arr);
    return Buffer.from(float32.buffer);
  }

  private bufferToFloat32(buf: Buffer): number[] {
    const float32 = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    return Array.from(float32);
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
}
