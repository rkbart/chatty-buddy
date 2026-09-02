# @chatty-buddy/react

A drop-in React component for RAG-powered chatbots with multi-provider LLM support.

## Installation

```bash
npm install @chatty-buddy/react
# or
pnpm add @chatty-buddy/react
```

## Quick Start

```tsx
import { RagChatbot } from '@chatty-buddy/react';

function App() {
  return (
    <RagChatbot
      provider="nvidia"
      apiKey={process.env.NVIDIA_API_KEY}
      model="meta/llama-3.1-8b-instruct"
      documentsPath="./docs"
    />
  );
}
```

## Features

- Multiple LLM providers
- Pluggable vector stores
- Smart document ingestion
- Responsive chat interface
- Customizable themes

## License

MIT
