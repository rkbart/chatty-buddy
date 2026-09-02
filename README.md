# Chatty-Buddy

A drop-in React component for RAG-powered chatbots with multi-provider LLM support.

## Features

- 🤖 Multiple LLM providers (NVIDIA, Ollama, OpenAI, Anthropic, Google)
- 🗄️ Pluggable vector stores (ChromaDB, Qdrant, In-Memory)
- 📄 Smart incremental document ingestion
- 💬 Embeddable, responsive chat interface
- 🎨 Customizable themes and positions

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

### 3. Use Component

```tsx
import { RagChatbot } from '@chatty-buddy/react';

function App() {
  return (
    <RagChatbot
      provider="nvidia"
      apiKey={process.env.NVIDIA_API_KEY}
      model="meta/llama-3.1-8b-instruct"
      documentsPath="./docs"
      position="bottom-right"
      theme="light"
    />
  );
}
```

## Free Options

### Ollama (100% Free)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.1
```

```tsx
<RagChatbot
  provider="ollama"
  model="llama3.1"
  documentsPath="./docs"
/>
```

### NVIDIA/Nemotron (Free Tier)

Get free API key at https://build.nvidia.com

```tsx
<RagChatbot
  provider="nvidia"
  apiKey="nvapi-xxx"
  model="meta/llama-3.1-8b-instruct"
  documentsPath="./docs"
/>
```

### Google Gemini (Free Tier)

Get free API key at https://aistudio.google.com

```tsx
<RagChatbot
  provider="google"
  apiKey="xxx"
  model="gemini-1.5-flash"
  documentsPath="./docs"
/>
```

## Configuration

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `provider` | `string` | required | LLM provider ID |
| `apiKey` | `string` | - | API key (required for non-local providers) |
| `model` | `string` | provider default | Model ID |
| `vectorStore` | `string` | `chromadb` | Vector store ID |
| `documentsPath` | `string` | required | Path to documents folder |
| `position` | `string` | `bottom-right` | Widget position |
| `theme` | `string` | `light` | Theme (light/dark/auto) |
| `title` | `string` | `AI Assistant` | Chat title |
| `primaryColor` | `string` | `#007bff` | Accent color |
| `systemPrompt` | `string` | - | Custom system prompt |
| `temperature` | `number` | `0.7` | Generation temperature |
| `maxTokens` | `number` | `1024` | Max response tokens |
| `showSources` | `boolean` | `true` | Show source citations |
| `chunkSize` | `number` | `500` | Text chunk size |
| `chunkOverlap` | `number` | `50` | Chunk overlap |
| `topK` | `number` | `5` | Number of context chunks |
| `serverPort` | `number` | auto | Server port |
| `dataDir` | `string` | `./.rag-chatbot` | Data directory |

### Supported Providers

| Provider | Free? | Models |
|----------|-------|--------|
| NVIDIA | ✅ | llama-3.1-8b, nemotron-70b |
| Ollama | ✅ | llama3.1, mistral, codellama, phi3 |
| OpenAI | ❌ | gpt-4o, gpt-4o-mini, gpt-4-turbo |
| Anthropic | ❌ | claude-3-5-sonnet, claude-3-5-haiku |
| Google | ✅ | gemini-1.5-flash, gemini-1.5-pro |

### Supported Vector Stores

| Store | Local | Persistent | Best For |
|-------|-------|------------|----------|
| ChromaDB | ✅ | ✅ | Development, small projects |
| In-Memory | ✅ | ❌ | Testing, prototyping |

### Supported Document Types

- PDF
- DOCX
- TXT
- Markdown (MD)
- HTML
- CSV

## Advanced Usage

### Custom System Prompt

```tsx
<RagChatbot
  provider="ollama"
  documentsPath="./docs"
  systemPrompt="You are a helpful assistant for our company. Answer questions based on the provided documents. Always cite your sources."
/>
```

### Custom Theme

```tsx
<RagChatbot
  provider="ollama"
  documentsPath="./docs"
  primaryColor="#8b5cf6"
  theme="dark"
  position="bottom-left"
/>
```

### In-Memory Store (for testing)

```tsx
<RagChatbot
  provider="ollama"
  documentsPath="./docs"
  vectorStore="inmemory"
/>
```

## Development

```bash
# Clone the repository
git clone https://github.com/your-username/chatty-buddy.git
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
