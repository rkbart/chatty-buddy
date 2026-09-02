import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { RagChatbotProps, Message } from './types.ts';
import { startEmbeddedServer, type ServerInstance } from './server/index.ts';
import { registry } from './server/services/llm/registry.ts';
import { vectorRegistry } from './server/services/stores/registry.ts';
import { NvidiaProvider } from './server/services/llm/nvidia.ts';
import { OllamaProvider } from './server/services/llm/ollama.ts';
import { OpenAIProvider } from './server/services/llm/openai.ts';
import { AnthropicProvider } from './server/services/llm/anthropic.ts';
import { GoogleProvider } from './server/services/llm/google.ts';
import { ChromaDBStore } from './server/services/stores/chromadb.ts';
import { InMemoryStore } from './server/services/stores/inmemory.ts';
import './styles.css';

// Register built-in providers and stores
function registerDefaults() {
  // Providers
  if (!registry.has('nvidia')) {
    // We'll register with placeholder - actual config comes from props
  }
  if (!registry.has('ollama')) {
    // We'll register with placeholder - actual config comes from props
  }

  // Stores
  if (!vectorRegistry.has('chromadb')) {
    vectorRegistry.register({
      id: 'chromadb',
      name: 'ChromaDB',
      create: (config) => new ChromaDBStore(config),
    });
  }
  if (!vectorRegistry.has('inmemory')) {
    vectorRegistry.register({
      id: 'inmemory',
      name: 'In-Memory',
      create: (config) => new InMemoryStore(config),
    });
  }
}

export function RagChatbot({
  provider,
  apiKey,
  model,
  vectorStore = 'chromadb',
  vectorStoreConfig,
  documentsPath,
  position = 'bottom-right',
  theme = 'light',
  title = 'AI Assistant',
  primaryColor = '#007bff',
  systemPrompt,
  temperature = 0.7,
  maxTokens = 1024,
  showSources = true,
  serverPort,
  dataDir = './.rag-chatbot',
}: RagChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [server, setServer] = useState<ServerInstance | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Register built-in providers and stores on mount
  useEffect(() => {
    registerDefaults();
  }, []);

  // Start embedded server on mount
  useEffect(() => {
    const initServer = async () => {
      try {
        // Register provider based on config
        switch (provider) {
          case 'nvidia':
            if (apiKey) {
              registry.register(new NvidiaProvider({ apiKey, model }));
            }
            break;
          case 'ollama':
            registry.register(new OllamaProvider({ model }));
            break;
          case 'openai':
            if (apiKey) {
              registry.register(new OpenAIProvider({ apiKey, model }));
            }
            break;
          case 'anthropic':
            if (apiKey) {
              registry.register(new AnthropicProvider({ apiKey, model }));
            }
            break;
          case 'google':
            if (apiKey) {
              registry.register(new GoogleProvider({ apiKey, model }));
            }
            break;
        }

        const instance = await startEmbeddedServer({
          provider,
          apiKey,
          model,
          vectorStore,
          vectorStoreConfig,
          documentsPath,
          systemPrompt,
          temperature,
          maxTokens,
          serverPort,
          dataDir,
        });
        setServer(instance);

        // Auto-ingest documents
        setIsIngesting(true);
        try {
          const response = await fetch(`http://localhost:${instance.port}/api/documents/ingest`, {
            method: 'POST',
          });
          if (response.ok) {
            console.log('Documents ingested successfully');
          }
        } catch (error) {
          console.error('Document ingestion error:', error);
        } finally {
          setIsIngesting(false);
        }
      } catch (error) {
        console.error('Server initialization error:', error);
        setServerError(error instanceof Error ? error.message : 'Failed to start server');
      }
    };

    initServer();

    return () => {
      server?.close();
    };
  }, [provider, apiKey, model, vectorStore, documentsPath]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || !server) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:${server.port}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantMessage += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage,
                  };
                  return updated;
                });
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, an error occurred. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, server, messages]);

  return (
    <div
      className={`rag-chatbot rag-chatbot--${position} rag-chatbot--${theme}`}
      style={{ '--primary-color': primaryColor } as React.CSSProperties}
    >
      {/* Chat widget button */}
      <button
        className="rag-chatbot__toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? '×' : '💬'}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="rag-chatbot__window">
          <div className="rag-chatbot__header">
            <h3>{title}</h3>
            <div className="rag-chatbot__header-actions">
              {isIngesting && <span className="rag-chatbot__ingesting">📚 Indexing...</span>}
              <button onClick={() => setIsOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
          </div>

          {serverError && (
            <div className="rag-chatbot__error">
              <p>⚠️ {serverError}</p>
            </div>
          )}

          <div className="rag-chatbot__messages">
            {messages.length === 0 && (
              <div className="rag-chatbot__welcome">
                <p>👋 Hi! Ask me anything about your documents.</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`rag-chatbot__message rag-chatbot__message--${msg.role}`}>
                <div className="rag-chatbot__message-content">{msg.content}</div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="rag-chatbot__message rag-chatbot__message--assistant rag-chatbot__message--loading">
                <div className="rag-chatbot__typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="rag-chatbot__input">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              disabled={isLoading || !!serverError}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim() || !!serverError}>
              {isLoading ? '...' : '→'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
