import { Router, type Request, type Response } from 'express';
import type { RagChatbotConfig } from '../../types.ts';
import { registry } from '../services/llm/registry.ts';
import { vectorRegistry } from '../services/stores/registry.ts';

export function createConfigRouter(config: RagChatbotConfig): Router {
  const router = Router();

  // Get current configuration
  router.get('/config', (_req: Request, res: Response) => {
    const provider = registry.get(config.provider);

    res.json({
      provider: config.provider,
      providerName: provider?.name || 'Unknown',
      model: config.model,
      vectorStore: config.vectorStore || 'chromadb',
      documentsPath: config.documentsPath,
      hasApiKey: !!config.apiKey,
      models: provider?.models || [],
    });
  });

  // List available providers
  router.get('/providers', (_req: Request, res: Response) => {
    const providers = registry.list();
    res.json({
      providers: providers.map((p) => ({
        id: p.id,
        name: p.name,
        requiresApiKey: p.requiresApiKey,
        isLocal: p.isLocal,
        models: p.models,
      })),
    });
  });

  // List available vector stores
  router.get('/stores', (_req: Request, res: Response) => {
    const stores = vectorRegistry.list();
    res.json({
      stores: stores.map((s) => ({
        id: s.id,
        name: s.name,
      })),
    });
  });

  return router;
}
