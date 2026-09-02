import type { LLMProvider, Message, ChatOptions, ModelInfo } from '../../types.ts';

const GOOGLE_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GoogleProvider implements LLMProvider {
  id = 'google';
  name = 'Google Gemini';
  models: ModelInfo[] = [
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      maxTokens: 1000000,
      supportsStreaming: true,
      supportsEmbeddings: false,
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      maxTokens: 2000000,
      supportsStreaming: true,
      supportsEmbeddings: false,
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      maxTokens: 32760,
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
    this.model = config.model || 'gemini-1.5-flash';
  }

  async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<string> {
    const url = `${GOOGLE_ENDPOINT}/${this.model}:streamGenerateContent?key=${this.apiKey}`;

    // Convert messages to Google format
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find((m) => m.role === 'system');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction
          ? { parts: [{ text: systemInstruction.content }] }
          : undefined,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 1024,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      // Handle newline-delimited JSON
      const lines = chunk.split('\n').filter((l) => l.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield text;
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}
