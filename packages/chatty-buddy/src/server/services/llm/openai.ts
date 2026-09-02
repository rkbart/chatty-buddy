import type { LLMProvider, Message, ChatOptions, ModelInfo } from '../../types.ts';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const OPENAI_EMBEDDING_ENDPOINT = 'https://api.openai.com/v1/embeddings';

export class OpenAIProvider implements LLMProvider {
  id = 'openai';
  name = 'OpenAI';
  models: ModelInfo[] = [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      maxTokens: 128000,
      supportsStreaming: true,
      supportsEmbeddings: false,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      maxTokens: 128000,
      supportsStreaming: true,
      supportsEmbeddings: false,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      maxTokens: 128000,
      supportsStreaming: true,
      supportsEmbeddings: false,
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      maxTokens: 16385,
      supportsStreaming: true,
      supportsEmbeddings: false,
    },
  ];
  requiresApiKey = true;
  isLocal = false;

  private apiKey: string;
  private model: string;

  constructor(config: { apiKey: string; model?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o-mini';
  }

  async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<string> {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch(OPENAI_EMBEDDING_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embedding error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.map((item: { embedding: number[] }) => item.embedding);
  }
}
