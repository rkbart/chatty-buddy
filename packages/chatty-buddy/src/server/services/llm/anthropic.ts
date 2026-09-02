import type { LLMProvider, Message, ChatOptions, ModelInfo } from '../../types.ts';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';

export class AnthropicProvider implements LLMProvider {
  id = 'anthropic';
  name = 'Anthropic';
  models: ModelInfo[] = [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      maxTokens: 200000,
      supportsStreaming: true,
      supportsEmbeddings: false,
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      maxTokens: 200000,
      supportsStreaming: true,
      supportsEmbeddings: false,
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      maxTokens: 200000,
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
    this.model = config.model || 'claude-3-5-haiku-20241022';
  }

  async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<string> {
    // Extract system message
    const systemMessage = messages.find((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    const response = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: otherMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
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

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta') {
            const text = parsed.delta?.text;
            if (text) yield text;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}
