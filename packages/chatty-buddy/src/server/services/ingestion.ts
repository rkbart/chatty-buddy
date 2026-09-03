import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { RagChatbotConfig } from '../../types.ts';
import { vectorRegistry } from './stores/registry.ts';
import { registry } from './llm/registry.ts';
import { parseDocument, isSupportedFile } from '../../utils/parsers.ts';
import { chunkText } from '../../utils/chunker.ts';
import {
  loadManifest,
  saveManifest,
  calculateFileHash,
  hasFileChanged,
  addFileToManifest,
  removeFileFromManifest,
  getIngestedFiles,
} from '../../utils/manifest.ts';

export interface IngestResult {
  ingested: string[];
  skipped: string[];
  deleted: string[];
  errors: { filename: string; error: string }[];
}

export async function ingestDocuments(config: RagChatbotConfig): Promise<IngestResult> {
  const documentsPath = config.documentsPath;
  if (!documentsPath || !existsSync(documentsPath)) {
    return { ingested: [], skipped: [], deleted: [], errors: [] };
  }

  const files = await readdir(documentsPath);
  const supportedFiles = files.filter(isSupportedFile);

  if (supportedFiles.length === 0) {
    return { ingested: [], skipped: [], deleted: [], errors: [] };
  }

  // Get vector store
  const store = vectorRegistry.create(
    config.vectorStore || 'sqlite',
    config.vectorStoreConfig || {}
  );
  await store.init({ collection: 'documents' });

  // Load manifest
  const manifest = await loadManifest(config.dataDir || './.chatty-buddy');

  const results: IngestResult = {
    ingested: [],
    skipped: [],
    deleted: [],
    errors: [],
  };

  // Check for deleted files
  const ingestedFiles = getIngestedFiles(manifest);
  for (const ingestedFile of ingestedFiles) {
    if (!supportedFiles.includes(ingestedFile)) {
      removeFileFromManifest(manifest, ingestedFile);
      results.deleted.push(ingestedFile);
    }
  }

  // Process each file
  for (const filename of supportedFiles) {
    try {
      const filePath = join(documentsPath, filename);
      const fileBuffer = await readFile(filePath);
      const fileHash = calculateFileHash(fileBuffer);

      // Check if file has changed
      if (!hasFileChanged(manifest, filename, fileHash)) {
        results.skipped.push(filename);
        continue;
      }

      // Parse document
      const parsed = await parseDocument(fileBuffer, filename);

      // Chunk text
      const chunks = chunkText(
        parsed.content,
        filename,
        config.chunkSize || 500,
        config.chunkOverlap || 50
      );

      // Generate embeddings if provider supports it
      const provider = registry.get(config.provider);
      if (provider?.embed) {
        const embeddings = await provider.embed(chunks.map((c) => c.content));

        // Store in vector database
        await store.add({
          collection: 'documents',
          ids: chunks.map((c) => c.id),
          embeddings,
          documents: chunks.map((c) => c.content),
          metadatas: chunks.map((c) => ({
            ...c.metadata,
            ...parsed.metadata,
          })),
        });
      }

      // Update manifest
      addFileToManifest(manifest, filename, fileHash, chunks.length, parsed.metadata.size);
      results.ingested.push(filename);
    } catch (error) {
      results.errors.push({
        filename,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Save manifest
  await saveManifest(config.dataDir || './.chatty-buddy', manifest);

  return results;
}

export async function listDocuments(config: RagChatbotConfig): Promise<Array<{
  filename: string;
  hash: string;
  ingestedAt: string;
  chunks: number;
  size: number;
}>> {
  const manifest = await loadManifest(config.dataDir || './.chatty-buddy');
  const files = getIngestedFiles(manifest);

  return files.map((filename) => ({
    filename,
    ...manifest.files[filename],
  }));
}

export async function deleteDocument(config: RagChatbotConfig, filename: string): Promise<void> {
  const store = vectorRegistry.create(
    config.vectorStore || 'sqlite',
    config.vectorStoreConfig || {}
  );
  await store.init({ collection: 'documents' });

  // Get all vectors for this file
  const results = await store.query({
    collection: 'documents',
    embedding: [0], // Dummy embedding
    topK: 10000,
    filter: { filename },
  });

  // Delete vectors
  await store.delete(results.map((r) => r.id));

  // Update manifest
  const manifest = await loadManifest(config.dataDir || './.chatty-buddy');
  removeFileFromManifest(manifest, filename);
  await saveManifest(config.dataDir || './.chatty-buddy', manifest);
}
