import express from 'express';
import cors from 'cors';
import { createServer, type Server as HttpServer } from 'http';
import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { RagChatbotConfig } from '../types.ts';
import { createChatRouter } from './routes/chat.ts';
import { createDocumentsRouter } from './routes/documents.ts';
import { createConfigRouter } from './routes/config.ts';
import { parseDocument, isSupportedFile } from '../utils/parsers.ts';
import { chunkText } from '../utils/chunker.ts';
import { vectorRegistry } from './services/stores/registry.ts';
import { registry } from './services/llm/registry.ts';
import {
  loadManifest,
  saveManifest,
  calculateFileHash,
  hasFileChanged,
  addFileToManifest,
} from '../utils/manifest.ts';

export interface ServerInstance {
  port: number;
  close: () => Promise<void>;
}

// Auto-ingest documents on startup
async function autoIngestDocuments(config: RagChatbotConfig): Promise<void> {
  const documentsPath = config.documentsPath;
  if (!documentsPath || !existsSync(documentsPath)) {
    console.log('📁 No documents directory found');
    return;
  }

  try {
    const files = await readdir(documentsPath);
    const supportedFiles = files.filter(isSupportedFile);

    if (supportedFiles.length === 0) {
      console.log('📄 No supported documents found');
      return;
    }

    // Get vector store
    const store = vectorRegistry.create(
      config.vectorStore || 'inmemory',
      config.vectorStoreConfig || {}
    );
    await store.init({ collection: 'documents' });

    // Load manifest
    const manifest = await loadManifest(config.dataDir || './.rag-chatbot');

    let ingestedCount = 0;

    for (const filename of supportedFiles) {
      try {
        const filePath = join(documentsPath, filename);
        const fileBuffer = await readFile(filePath);
        const fileHash = calculateFileHash(fileBuffer);

        // Skip if already ingested
        if (!hasFileChanged(manifest, filename, fileHash)) {
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
        ingestedCount++;
        console.log(`📄 Ingested: ${filename}`);
      } catch (error) {
        console.error(`❌ Error ingesting ${filename}:`, error);
      }
    }

    // Save manifest
    await saveManifest(config.dataDir || './.rag-chatbot', manifest);

    if (ingestedCount > 0) {
      console.log(`📚 Auto-ingested ${ingestedCount} document(s)`);
    }
  } catch (error) {
    console.error('❌ Auto-ingest error:', error);
  }
}

export async function startEmbeddedServer(config: RagChatbotConfig): Promise<ServerInstance> {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Mount routes
  app.use('/api', createChatRouter(config));
  app.use('/api', createDocumentsRouter(config));
  app.use('/api', createConfigRouter(config));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Find available port
  const port = config.serverPort || (await findAvailablePort(3000));

  const server: HttpServer = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.listen(port, () => resolve());
    server.on('error', reject);
  });

  // Auto-ingest documents after server starts
  await autoIngestDocuments(config);

  return {
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}

async function findAvailablePort(startPort: number): Promise<number> {
  const net = await import('net');

  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      server.close(() => resolve(startPort));
    });
    server.on('error', () => resolve(findAvailablePort(startPort + 1)));
  });
}
