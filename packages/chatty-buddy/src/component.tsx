import React, { useState, useEffect, useRef, useCallback } from 'react';
import Markdown from 'react-markdown';
import type { RagChatbotProps, Message } from './types.ts';
import './styles.css';

export function RagChatbot({
  apiUrl = 'http://localhost:3000',
  position = 'bottom-right',
  theme = 'light',
  title = 'AI Assistant',
  primaryColor = '#007bff',
  placeholder = 'Ask me anything...',
  className,
  style,
  onMessage,
}: RagChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check server connection on mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${apiUrl}/health`);
        if (response.ok) {
          setIsConnected(true);
          setServerError(null);

          // Auto-ingest documents
          setIsIngesting(true);
          try {
            const ingestResponse = await fetch(`${apiUrl}/api/documents/ingest`, {
              method: 'POST',
            });
            if (ingestResponse.ok) {
              console.log('Documents ingested successfully');
            }
          } catch (error) {
            console.error('Document ingestion error:', error);
          } finally {
            setIsIngesting(false);
          }
        }
      } catch {
        setServerError('Server not running. Start the server with: npx chatty-buddy-server');
      }
    };

    checkServer();
  }, [apiUrl]);

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
    if (!input.trim() || isLoading || !isConnected) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
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

      // Call onMessage callback
      if (onMessage) {
        onMessage({ role: 'assistant', content: assistantMessage });
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
  }, [input, isLoading, isConnected, messages, apiUrl, onMessage]);

  return (
    <div
      className={`rag-chatbot rag-chatbot--${position} rag-chatbot--${theme}${className ? ` ${className}` : ''}`}
      style={{ '--primary-color': primaryColor, ...style } as React.CSSProperties}
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
                <div className="rag-chatbot__message-content">
                  {msg.role === 'assistant' ? (
                    <Markdown>{msg.content}</Markdown>
                  ) : (
                    msg.content
                  )}
                </div>
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
              placeholder={placeholder}
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
