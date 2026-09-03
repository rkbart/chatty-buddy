import express from 'express';
import cors from 'cors';
import { createServer, type Server as HttpServer } from 'http';
import type { RagChatbotConfig } from '../types.ts';
import { createChatRouter } from './routes/chat.ts';
import { createDocumentsRouter } from './routes/documents.ts';
import { createConfigRouter } from './routes/config.ts';
import { ingestDocuments } from './services/ingestion.ts';

export interface ServerInstance {
  port: number;
  close: () => Promise<void>;
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
  try {
    const results = await ingestDocuments(config);
    if (results.ingested.length > 0) {
      console.log(`📚 Auto-ingested ${results.ingested.length} document(s)`);
    }
    if (results.deleted.length > 0) {
      console.log(`🗑️ Removed ${results.deleted.length} deleted document(s)`);
    }
  } catch (error) {
    console.error('❌ Auto-ingest error:', error);
  }

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
