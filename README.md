# Chatty-Buddy

A drop-in React component for RAG-powered chatbots with multi-provider LLM support.

## Features

- 🤖 Multiple LLM providers (NVIDIA, Ollama, OpenAI, Anthropic, Google)
- 🗄️ Built-in SQLite vector store (persistent, no external DB needed)
- 📄 Smart incremental document ingestion
- 💬 Embeddable, responsive chat interface with markdown rendering
- 🎨 Customizable themes and positions
- 📝 Streaming markdown support (code blocks, lists, tables, etc.)

## Quick Start

### 1. Install

```bash
npm install @chatty-buddy/react
# or
pnpm add @chatty-buddy/react
```

### 2. Add Documents

Place your documents in a folder:

```
./docs/
├── handbook.pdf
├── manual.docx
├── faq.md
└── data.txt
```

### 3. Create Config File

Create `.chatty-buddy.json` in your project root:

```json
{
  "provider": "nvidia",
  "apiKey": "your-api-key",
  "model": "meta/llama-3.2-11b-vision-instruct",
  "documentsPath": "./docs"
}
```

### 4. Start Server

```bash
npx chatty-buddy-server
```

### 5. Use Component

```tsx
import { RagChatbot } from '@chatty-buddy/react';

function App() {
  return (
    <RagChatbot
      apiUrl="http://localhost:3000"
      position="bottom-right"
      theme="light"
      title="Support Bot"
    />
  );
}
```

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiUrl` | `string` | `http://localhost:3000` | Backend API URL |
| `position` | `string` | `bottom-right` | Widget position |
| `theme` | `string` | `light` | Theme (light/dark) |
| `title` | `string` | `AI Assistant` | Chat title |
| `primaryColor` | `string` | `#007bff` | Accent color |
| `placeholder` | `string` | `Ask me anything...` | Input placeholder |
| `className` | `string` | - | Additional CSS class |
| `style` | `CSSProperties` | - | Additional inline styles |
| `onMessage` | `(msg) => void` | - | Callback when message received |

## Server Configuration

### Config File (`.chatty-buddy.json`)

```json
{
  "provider": "nvidia",
  "apiKey": "your-api-key",
  "model": "meta/llama-3.2-11b-vision-instruct",
  "vectorStore": "sqlite",
  "documentsPath": "./docs",
  "port": 3000,
  "systemPrompt": "Answer based on the provided documents only."
}
```

### Environment Variables

```bash
RAG_PROVIDER=nvidia
RAG_API_KEY=your-api-key
RAG_MODEL=meta/llama-3.2-11b-vision-instruct
RAG_DOCUMENTS_PATH=./docs
RAG_SERVER_PORT=3000
```

### CLI Arguments

```bash
npx chatty-buddy-server --provider nvidia --api-key your-key --port 3000
```

## Free Options

### Ollama (100% Free)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.1
```

```json
{
  "provider": "ollama",
  "model": "llama3.1",
  "documentsPath": "./docs"
}
```

### NVIDIA (Free Tier)

Get free API key at https://build.nvidia.com

```json
{
  "provider": "nvidia",
  "apiKey": "nvapi-xxx",
  "model": "meta/llama-3.2-11b-vision-instruct",
  "documentsPath": "./docs"
}
```

### Google Gemini (Free Tier)

Get free API key at https://aistudio.google.com

```json
{
  "provider": "google",
  "apiKey": "xxx",
  "model": "gemini-1.5-flash",
  "documentsPath": "./docs"
}
```

## Markdown Support

The chat component renders markdown in assistant responses, including:

- **Bold** and *italic* text
- `Inline code` and code blocks
- Bullet and numbered lists
- Tables
- Blockquotes
- Headings
- Links

Markdown is streamed without flickering using `@deltakit/markdown`.

## Supported Providers

| Provider | Free? | Models |
|----------|-------|--------|
| NVIDIA | ✅ | llama-3.2-11b, llama-3.1-8b |
| Ollama | ✅ | llama3.1, mistral, codellama, phi3 |
| OpenAI | ❌ | gpt-4o, gpt-4o-mini |
| Anthropic | ❌ | claude-3-5-sonnet, claude-3-5-haiku |
| Google | ✅ | gemini-1.5-flash, gemini-1.5-pro |

## Supported Document Types

- PDF
- DOCX
- TXT
- Markdown (MD)
- HTML
- CSV

## Database

Chatty-Buddy uses SQLite as its built-in vector store:

- **Persistent**: Documents survive server restarts
- **No external DB**: No ChromaDB, Pinecone, or Postgres required
- **Automatic**: Database is created automatically on first run
- **Location**: `.chatty-buddy/data.db`

## Development

```bash
# Clone the repository
git clone https://github.com/rkbart/chatty-buddy.git
cd chatty-buddy

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build
```

## License

MIT
