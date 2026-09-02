import type { LLMProvider, Message, ChatOptions, ModelInfo } from '../../types.ts';

const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

export class NvidiaProvider implements LLMProvider {
  id = 'nvidia';
  name = 'NVIDIA/Nemotron';
  models: ModelInfo[] = [
    {
      id: 'meta/llama-3.1-8b-instruct',
      name: 'Llama 3.1 8B',
      maxTokens: 4096,
      supportsStreaming: true,
      supportsEmbeddings: false,
    },
    {
      id: 'nvidia/llama-3.1-nemotron-70b-instruct',
      name: 'Nemotron 70B',
      maxTokens: 4096,
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
    this.model = config.model || 'meta/llama-3.1-8b-instruct';
  }

  async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<string> {
    const response = await fetch(NVIDIA_ENDPOINT, {
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
      throw new Error(`NVIDIA API error: ${response.status} ${response.statusText}`);
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
}
