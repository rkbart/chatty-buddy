# 📚 Chatty-Buddy Wiki

Welcome! This wiki explains **how the Chatty-Buddy codebase works**, piece by piece, in plain language. It is written for **beginners**: every file, function, and design decision is explained with the *why*, not just the *what*.

> **TL;DR of the project:** Chatty-Buddy is a drop-in React chat widget + a small Node/Express backend that answers questions **using your own documents** (a technique called **RAG** — Retrieval-Augmented Generation). It ships with a zero-setup SQLite vector database and supports multiple LLM providers (NVIDIA, Ollama, OpenAI, Anthropic, Google).

## How to read this wiki

If you're brand new, read in order. If you already know RAG basics, jump to `02-architecture.md`.

| # | Page | What you'll learn |
|---|------|-------------------|
| 01 | [Core Concepts](./01-concepts.md) | RAG, embeddings, vector stores, chunking, SSE — explained from zero |
| 02 | [Architecture](./02-architecture.md) | Big picture: layers, folders, entry points, the registry pattern |
| 03 | [Request Flows](./03-request-flow.md) | Step-by-step walkthroughs: startup, chat, ingestion, deletion |
| 04 | [Server Reference](./04-server-reference.md) | `startEmbeddedServer`, all HTTP routes, config resolution |
| 05 | [Services Reference](./05-services-reference.md) | LLM providers, vector stores, registries, ingestion service |
| 06 | [Utilities Reference](./06-utilities-reference.md) | Chunker, manifest, document parsers |
| 07 | [UI Component](./07-ui-component.md) | The `<RagChatbot />` React component in detail |
| 08 | [Design Decisions](./08-design-decisions.md) | Why the code is built this way — trade-offs and known limitations |
| 09 | [Extending & Contributing](./09-extending.md) | Add your own provider/store/parser; testing and building |

## The 60-second version

```
Your browser                          Your Node server
┌──────────────────┐   POST /api/chat  ┌───────────────────────────────┐
│ <RagChatbot />   │ ────────────────► │ chat route:                   │
│ (React widget)   │ ◄──────────────── │  1. embed the question        │
└──────────────────┘   SSE stream      │  2. find similar doc chunks   │
                                       │  3. stuff context into prompt │
                                       │  4. stream LLM answer back    │
                                       └──────────────┬────────────────┘
                                                      │
                                       ┌──────────────▼────────────────┐
                                       │ SQLite vector DB (./.chatty-  │
                                       │ buddy/data.db) + manifest.json│
                                       └───────────────────────────────┘
```

Documents from your `docs/` folder are **parsed → chunked → embedded → stored** in the vector DB. At chat time, the most similar chunks are retrieved and given to the LLM as context, so answers are grounded in your files.

## Key file map (repository root)

```
chatty-buddy/
├── package.json                  # Root workspace: scripts (dev, build, test)
├── pnpm-workspace.yaml           # pnpm monorepo definition
├── tsconfig.base.json            # Shared TypeScript settings
├── tsdown.config.ts              # Root bundler config (library build via tsdown)
├── vitest.config.ts              # Test runner config
└── packages/
    └── chatty-buddy/             # The publishable package: @chatty-buddy/react
        ├── package.json          # Package manifest (bin, exports, deps)
        ├── tsup.config.ts        # Bundler config (3 build targets)
        ├── bin/server.ts         # CLI entry → `npx chatty-buddy-server`
        └── src/
            ├── browser.ts        # Browser entry (React component + CSS only)
            ├── index.ts          # Full library entry (server + utilities)
            ├── server.ts         # Embedded demo server (env-var configured)
            ├── types.ts          # ⭐ ALL shared TypeScript interfaces
            ├── component.tsx     # <RagChatbot /> React component
            ├── styles.css        # Component styling
            ├── server/
            │   ├── index.ts      # startEmbeddedServer() — Express app
            │   ├── config.ts     # Config resolution (CLI > env > file > default)
            │   ├── routes/       # chat.ts, documents.ts, config.ts (HTTP API)
            │   └── services/     # llm/ providers, stores/, ingestion.ts
            └── utils/            # chunker.ts, parsers.ts, manifest.ts
```

## Where do I start?

- **To use it:** see the [main README](../README.md).
- **To understand it:** start at [01-concepts.md](./01-concepts.md).
- **To change/extend it:** go straight to [09-extending.md](./09-extending.md).
