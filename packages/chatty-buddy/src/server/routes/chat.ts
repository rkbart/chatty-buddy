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
        config.vectorStore || 'chromadb',
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
      const defaultPrompt = `You are a helpful assistant that answers questions ONLY based on the provided context/documents.

RULES:
1. ONLY answer using information found in the context below.
2. If the answer is NOT in the context, respond EXACTLY: "I don't have information about that in the provided documents."
3. Do NOT use your own knowledge or make up answers.
4. Do NOT provide general knowledge answers even if you know them.
5. If the context is empty or doesn't contain relevant information, say: "I don't have information about that in the provided documents."
6. Keep answers concise and directly from the source material.`;

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
