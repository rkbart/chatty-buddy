import { Router, type Request, type Response } from 'express';
import type { RagChatbotConfig, Message } from '../../types.ts';
import { registry } from '../services/llm/registry.ts';
import { vectorRegistry } from '../services/stores/registry.ts';

export function createChatRouter(config: RagChatbotConfig): Router {
  const router = Router();

  router.post('/chat', async (req: Request, res: Response) => {
    try {
      const { messages } = req.body as { messages: Message[] };

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      // Get LLM provider
      const provider = registry.get(config.provider);
      if (!provider) {
        return res.status(400).json({ error: `Unknown provider: ${config.provider}` });
      }

      // Get vector store for RAG
      const store = vectorRegistry.create(
        config.vectorStore || 'sqlite',
        config.vectorStoreConfig || {}
      );

      await store.init({ collection: 'documents' });

      // Query for relevant context
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
      if (!lastUserMessage) {
        return res.status(400).json({ error: 'No user message found' });
      }

      let contextText = '';

      // Only do RAG if we have embeddings
      if (provider.embed) {
        try {
          const queryEmbedding = (await provider.embed([lastUserMessage.content]))[0];
          const results = await store.query({
            collection: 'documents',
            embedding: queryEmbedding,
            topK: config.topK || 5,
          });

          if (results.length > 0) {
            contextText = results.map((r) => r.document).join('\n\n');
          }
        } catch (error) {
          console.error('RAG query error:', error);
          // Continue without context
        }
      }

      // Build system prompt with context
      const defaultPrompt = `You are a document search assistant. You ONLY answer questions using the exact information found in the CONTEXT below.

CRITICAL RULES - BREAKING THESE IS FORBIDDEN:
1. You are FORBIDDEN from using any knowledge outside the CONTEXT.
2. You are FORBIDDEN from explaining concepts not explicitly stated in the CONTEXT.
3. You are FORBIDDEN from providing examples not in the CONTEXT.
4. You are FORBIDDEN from saying "I don't have information" - instead say "No information available in the provided context."
5. You CANNOT answer questions about yourself, your name, or your capabilities.
6. If a question cannot be answered from the CONTEXT, respond ONLY: "No information available in the provided context."
7. NEVER add extra information, explanations, or details beyond what's in the CONTEXT.
8. If CONTEXT is empty, respond ONLY: "No documents available."

YOUR ONLY JOB: Extract and repeat information that EXISTS in the CONTEXT below. Nothing more.`;

      const systemPrompt = config.systemPrompt || defaultPrompt;
      const systemMessage: Message = {
        role: 'system',
        content: contextText
          ? `${systemPrompt}\n\nCONTEXT:\n${contextText}`
          : `${systemPrompt}\n\nCONTEXT:\nNo documents provided.`,
      };

      // Stream response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const chatMessages = [systemMessage, ...messages];

      for await (const chunk of provider.chat(chatMessages, {
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      })) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error('Chat error:', error);
      if (!res.headersSent) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Internal server error', details: errorMessage });
      }
    }
  });

  return router;
}
