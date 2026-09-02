import type { LLMProvider, Message, ChatOptions, ModelInfo } from '../../types.ts';

const OLLAMA_BASE = 'http://localhost:11434';

export class OllamaProvider implements LLMProvider {
  id = 'ollama';
  name = 'Ollama (Local)';
  models: ModelInfo[] = [
    {
      id: 'llama3.1',
      name: 'Llama 3.1',
      maxTokens: 4096,
      supportsStreaming: true,
      supportsEmbeddings: true,
    },
    {
      id: 'mistral',
      name: 'Mistral',
      maxTokens: 4096,
      supportsStreaming: true,
      supportsEmbeddings: true,
    },
    {
      id: 'codellama',
      name: 'Code Llama',
      maxTokens: 4096,
      supportsStreaming: true,
      supportsEmbeddings: true,
    },
    {
      id: 'phi3',
      name: 'Phi-3',
      maxTokens: 4096,
      supportsStreaming: true,
      supportsEmbeddings: true,
    },
  ];
  requiresApiKey = false;
  isLocal = true;

  private model: string;
  private baseUrl: string;

  constructor(config: { model?: string; baseUrl?: string }) {
    this.model = config.model || 'llama3.1';
    this.baseUrl = config.baseUrl || OLLAMA_BASE;
  }

  async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 1024,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const line = decoder.decode(value);
      try {
        const parsed = JSON.parse(line);
        if (parsed.message?.content) yield parsed.message.content;
      } catch {
        // Skip invalid JSON
      }
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding error: ${response.status}`);
      }

      const data = await response.json();
      embeddings.push(data.embedding);
    }

    return embeddings;
  }
}
