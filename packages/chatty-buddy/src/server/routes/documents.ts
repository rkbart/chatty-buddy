import { Router, type Request, type Response } from 'express';
import type { RagChatbotConfig } from '../../types.ts';
import { ingestDocuments, listDocuments, deleteDocument } from '../services/ingestion.ts';

export function createDocumentsRouter(config: RagChatbotConfig): Router {
  const router = Router();

  // List documents
  router.get('/documents', async (_req: Request, res: Response) => {
    try {
      const documents = await listDocuments(config);
      res.json({ documents });
    } catch (error) {
      console.error('List documents error:', error);
      res.status(500).json({ error: 'Failed to list documents' });
    }
  });

  // Ingest documents (optional ?force=true to re-ingest all)
  router.post('/documents/ingest', async (req: Request, res: Response) => {
    try {
      const force = req.query.force === 'true';
      const results = await ingestDocuments(config, force);
      res.json(results);
    } catch (error) {
      console.error('Ingest documents error:', error);
      res.status(500).json({ error: 'Failed to ingest documents' });
    }
  });

  // Delete document
  router.delete('/documents/:filename', async (req: Request, res: Response) => {
    try {
      const filename = decodeURIComponent(req.params.filename);
      await deleteDocument(config, filename);
      res.json({ success: true, deleted: filename });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  return router;
}
