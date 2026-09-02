import { Router, type Request, type Response } from 'express';
import { readdir, readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import type { RagChatbotConfig } from '../../types.ts';
import { vectorRegistry } from '../services/stores/registry.ts';
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

export function createDocumentsRouter(config: RagChatbotConfig): Router {
  const router = Router();

  // List documents
  router.get('/documents', async (_req: Request, res: Response) => {
    try {
      const manifest = await loadManifest(config.dataDir || './.rag-chatbot');
      const files = getIngestedFiles(manifest);

      res.json({
        documents: files.map((filename) => ({
          filename,
          ...manifest.files[filename],
        })),
      });
    } catch (error) {
      console.error('List documents error:', error);
      res.status(500).json({ error: 'Failed to list documents' });
    }
  });

  // Ingest documents
  router.post('/documents/ingest', async (_req: Request, res: Response) => {
    try {
      const documentsPath = config.documentsPath;
      if (!documentsPath) {
        return res.status(400).json({ error: 'documentsPath is required' });
      }

      // Get vector store
      const store = vectorRegistry.create(
        config.vectorStore || 'chromadb',
        config.vectorStoreConfig || {}
      );
      await store.init({ collection: 'documents' });

      // Load manifest
      const manifest = await loadManifest(config.dataDir || './.rag-chatbot');

      // Scan directory
      const files = await readdir(documentsPath);
      const supportedFiles = files.filter(isSupportedFile);

      const results = {
        ingested: [] as string[],
        skipped: [] as string[],
        deleted: [] as string[],
        errors: [] as { filename: string; error: string }[],
      };

      // Check for deleted files
      const ingestedFiles = getIngestedFiles(manifest);
      for (const ingestedFile of ingestedFiles) {
        if (!supportedFiles.includes(ingestedFile)) {
          // File was deleted
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
      await saveManifest(config.dataDir || './.rag-chatbot', manifest);

      res.json(results);
    } catch (error) {
      console.error('Ingest documents error:', error);
      res.status(500).json({ error: 'Failed to ingest documents' });
    }
  });

  // Delete document
  router.delete('/documents/:filename', async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;

      const store = vectorRegistry.create(
        config.vectorStore || 'chromadb',
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
      const manifest = await loadManifest(config.dataDir || './.rag-chatbot');
      removeFileFromManifest(manifest, filename);
      await saveManifest(config.dataDir || './.rag-chatbot', manifest);

      res.json({ success: true, deleted: filename });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  return router;
}

// Import registry for provider access
import { registry } from '../services/llm/registry.ts';
