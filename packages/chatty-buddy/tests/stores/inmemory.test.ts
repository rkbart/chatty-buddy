import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStore } from '../../src/server/services/stores/inmemory.ts';

describe('InMemoryStore', () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore({ collection: 'test' });
  });

  it('has correct id and name', () => {
    expect(store.id).toBe('inmemory');
    expect(store.name).toBe('In-Memory');
  });

  it('is local and not persistent', () => {
    expect(store.isLocal).toBe(true);
    expect(store.isPersistent).toBe(false);
  });

  it('can add and query vectors', async () => {
    await store.init({ collection: 'test' });

    await store.add({
      collection: 'test',
      ids: ['1', '2', '3'],
      embeddings: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      documents: ['doc1', 'doc2', 'doc3'],
      metadatas: [{ type: 'a' }, { type: 'b' }, { type: 'c' }],
    });

    const results = await store.query({
      collection: 'test',
      embedding: [1, 0, 0],
      topK: 2,
    });

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('1');
    expect(results[0].distance).toBe(1);
  });

  it('can delete vectors', async () => {
    await store.init({ collection: 'test' });

    await store.add({
      collection: 'test',
      ids: ['1', '2'],
      embeddings: [
        [1, 0],
        [0, 1],
      ],
      documents: ['doc1', 'doc2'],
      metadatas: [{ type: 'a' }, { type: 'b' }],
    });

    await store.delete(['1']);

    const results = await store.query({
      collection: 'test',
      embedding: [1, 0],
      topK: 10,
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('2');
  });

  it('can clear collection', async () => {
    await store.init({ collection: 'test' });

    await store.add({
      collection: 'test',
      ids: ['1'],
      embeddings: [[1, 0]],
      documents: ['doc1'],
      metadatas: [{ type: 'a' }],
    });

    await store.clear('test');

    const stats = await store.stats('test');
    expect(stats.count).toBe(0);
  });

  it('returns stats', async () => {
    await store.init({ collection: 'test' });

    await store.add({
      collection: 'test',
      ids: ['1', '2', '3'],
      embeddings: [
        [1, 0],
        [0, 1],
        [1, 1],
      ],
      documents: ['doc1', 'doc2', 'doc3'],
      metadatas: [{ type: 'a' }, { type: 'b' }, { type: 'c' }],
    });

    const stats = await store.stats('test');
    expect(stats.count).toBe(3);
    expect(stats.collection).toBe('test');
  });

  it('can destroy', async () => {
    await store.init({ collection: 'test' });

    await store.add({
      collection: 'test',
      ids: ['1'],
      embeddings: [[1, 0]],
      documents: ['doc1'],
      metadatas: [{ type: 'a' }],
    });

    await store.destroy();

    const stats = await store.stats('test');
    expect(stats.count).toBe(0);
  });
});
