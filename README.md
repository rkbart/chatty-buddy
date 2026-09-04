# Chatty-Buddy

A drop-in React component for RAG-powered chatbots with multi-provider LLM support.

## Features

- 🤖 Multiple LLM providers (NVIDIA, Ollama, OpenAI, Anthropic, Google)
- 🗄️ Built-in SQLite vector store (persistent, no external DB needed)
- 📄 Smart incremental document ingestion with change detection
- 🗑️ Automatic vector cleanup on file delete/update
- 💬 Embeddable, responsive chat interface with markdown rendering
- 🎨 Customizable themes and positions
- 📝 Markdown support (code blocks, lists, tables, etc.)

## Quick Start

### 1. Install

```bash
npm install @chatty-buddy/react
```

### 2. Create Config File

Create `.chatty-buddy.json` in your project root:

```json
{
  "provider": "nvidia",
  "apiKey": "your-api-key",
  "model": "meta/llama-3.2-11b-vision-instruct",
  "documentsPath": "./docs"
}
```

### 3. Add Documents

Place your documents in a folder:

```
your-app/
├── docs/
│   ├── faq.md
│   └── product.txt
├── .chatty-buddy.json
└── src/
    └── App.tsx
```

### 4. Start Server

```bash
npx chatty-buddy-server
```

### 5. Use Component

```tsx
import { RagChatbot } from '@chatty-buddy/react';
import '@chatty-buddy/react/styles.css';

function App() {
  return (
    <RagChatbot
      apiUrl="http://localhost:3000"
      title="Support Bot"
      theme="dark"
      position="bottom-right"
    />
  );
}
```

## Document Management

### Update Documents

When you add, modify, or delete files in your `docs/` folder, re-sync the bot:

```bash
# Re-ingest changed files
curl -X POST http://localhost:3000/api/documents/ingest

# Force re-ingest ALL files (ignore hash)
curl -X POST "http://localhost:3000/api/documents/ingest?force=true"
```

The server detects changes via SHA-256 content hashing. On re-ingest:
- **Changed files**: Old vectors deleted, new ones inserted
- **Deleted files**: Vectors removed from vector store
- **Unchanged files**: Skipped (no work done)

### Delete a Document

```bash
curl -X DELETE http://localhost:3000/api/documents/faq.md
```

### List Ingested Documents

```bash
curl http://localhost:3000/api/documents
```

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiUrl` | `string` | `http://localhost:3000` | Backend API URL |
| `position` | `string` | `bottom-right` | Widget position |
| `theme` | `string` | `light` | `light` or `dark` |
| `title` | `string` | `AI Assistant` | Chat header title |
| `primaryColor` | `string` | `#007bff` | Accent color |
| `placeholder` | `string` | `Ask me anything...` | Input placeholder |
| `className` | `string` | - | Additional CSS class |
| `style` | `CSSProperties` | - | Inline styles |
| `onMessage` | `(msg) => void` | - | Callback on response |

## Server Configuration

### Config File (`.chatty-buddy.json`)

```json
{
  "provider": "nvidia",
  "apiKey": "your-api-key",
  "model": "meta/llama-3.2-11b-vision-instruct",
  "vectorStore": "sqlite",
  "documentsPath": "./docs",
  "embeddingModel": "nvidia/nemotron-3-embed-1b",
  "chunkSize": 500,
  "chunkOverlap": 50,
  "port": 3000,
  "systemPrompt": "Answer based on the provided documents only."
}
```

### CLI Arguments

```bash
npx chatty-buddy-server \
  --provider nvidia \
  --api-key your-key \
  --model meta/llama-3.2-11b-vision-instruct \
  --embedding-model nvidia/nemotron-3-embed-1b \
  --documents ./docs \
  --port 3000
```

### Environment Variables

```bash
RAG_PROVIDER=nvidia
RAG_API_KEY=your-api-key
RAG_MODEL=meta/llama-3.2-11b-vision-instruct
RAG_EMBEDDING_MODEL=nvidia/nemotron-3-embed-1b
RAG_DOCUMENTS_PATH=./docs
RAG_SERVER_PORT=3000
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

## Supported Providers

| Provider | Free? | Embeddings? | Models |
|----------|-------|-------------|--------|
| NVIDIA | ✅ | ✅ | llama-3.2-11b, llama-3.1-8b |
| Ollama | ✅ | ❌ | llama3.1, mistral, codellama, phi3 |
| OpenAI | ❌ | ✅ | gpt-4o, gpt-4o-mini |
| Anthropic | ❌ | ❌ | claude-3-5-sonnet, claude-3-5-haiku |
| Google | ✅ | ❌ | gemini-1.5-flash, gemini-1.5-pro |

## Supported Document Types

- PDF
- DOCX
- TXT
- Markdown (MD)
- HTML
- CSV

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send a chat message |
| `GET` | `/api/documents` | List ingested documents |
| `POST` | `/api/documents/ingest` | Ingest new/changed files |
| `POST` | `/api/documents/ingest?force=true` | Force re-ingest all files |
| `DELETE` | `/api/documents/:filename` | Delete a document |

## Database

Chatty-Buddy uses SQLite as its built-in vector store:

- **Persistent**: Documents survive server restarts
- **No external DB**: No ChromaDB, Pinecone, or Postgres required
- **Automatic**: Database is created automatically on first run
- **Location**: `.chatty-buddy/data.db`
- **Change detection**: SHA-256 content hashing (not mtime)
- **Vector cleanup**: Old vectors auto-deleted on file update/delete

## Development

```bash
# Clone the repository
git clone https://github.com/rkbart/chatty-buddy.git
cd chatty-buddy

# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test
```

## License

MIT
