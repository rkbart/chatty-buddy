# 02 — Architecture

## High-level picture

Chatty-Buddy is split into **two halves** that only talk over HTTP:

```
┌────────────────────────── BROWSER ──────────────────────────┐
│   Your React app                                            │
│     └── <RagChatbot />  (src/component.tsx + styles.css)    │
│           │  fetch: /health, /api/chat, /api/documents/...  │
└───────────┼─────────────────────────────────────────────────┘
            │ HTTP (JSON + SSE)
┌───────────▼──────────────────── NODE ───────────────────────┐
│  Express app (src/server/index.ts)                          │
│  ├── routes/chat.ts        → POST /api/chat   (SSE stream)  │
│  ├── routes/documents.ts   → list / ingest / delete        │
│  ├── routes/config.ts      → /config /providers /stores     │
│  ├── services/ingestion.ts → parse → chunk → embed → store │
│  ├── services/llm/         → LLM providers + registry       │
│  └── services/stores/      → vector stores  + registry      │
│  utils: chunker.ts, parsers.ts, manifest.ts                 │
└─────────────────────────────────────────────────────────────┘
```

The **React component is deliberately dumb**: it knows only `apiUrl` and renders a chat window. All AI logic lives server-side so an API key never reaches the browser.

## The three entry points

The package builds **three different bundles** from `tsup.config.ts`:

| Entry file | Built to | Who uses it | Contains |
|-----------|----------|-------------|----------|
| `src/browser.ts` | `dist/browser.js/.cjs/.d.ts` + CSS | Frontend devs (`import { RagChatbot } from '@chatty-buddy/react'`) | Component + CSS + types only |
| `src/index.ts` | `dist/index.server.js` | Node devs embedding the lib (`@chatty-buddy/react/server`) | Everything: server, providers, utils |
| `bin/server.ts` | `dist/server.cli.js` | The CLI (`npx chatty-buddy-server`) | Config resolution + `startEmbeddedServer()` |

Why three? **The browser bundle must not pull in `express`, `better-sqlite3`, etc.** Those are Node-only dependencies; shipping them to a browser would break. `browser.ts` exists to keep the client bundle tiny.

Two "main" files exist:

- `bin/server.ts` — the **real CLI**. Resolves config from CLI args/env/file/defaults, registers the chosen provider, registers `sqlite` (and lazily `chromadb`), calls `startEmbeddedServer`, handles SIGINT/SIGTERM (and ignores SIGHUP so closing a terminal doesn't kill background runs).
- `src/server.ts` — a **demo/embedded starter** configured purely from `RAG_*` env vars. It registers `chromadb` + `inmemory` by default. (Historical quirk: it defaults `vectorStore` to `'chromadb'` while the CLI defaults to `'sqlite'` — see [08-design-decisions.md](./08-design-decisions.md).)

## The registry pattern (the heart of the design)

Every swappable piece is behind an **interface + registry**:

```
        LLMProvider (interface)             VectorStore (interface)
        ├── NvidiaProvider                  ├── SQLiteStore
        ├── OllamaProvider                  ├── InMemoryStore
        ├── OpenAIProvider                  └── ChromaDBStore
        ├── AnthropicProvider
        └── GoogleProvider

   ProviderRegistry                     VectorStoreRegistry
   (services/llm/registry.ts)           (services/stores/registry.ts)
   Map<id, LLMProvider instance>        Map<id, factory: (cfg) => VectorStore>
```

Flow: at **startup**, the entry file looks at `config.provider` and registers **one** LLM provider into the global `registry` singleton. At **request time**, routes ask `registry.get(config.provider)` or `vectorRegistry.create(config.vectorStore, cfg)`.

Benefits (the pattern is **dependency injection** via registry):
- Adding a provider = one file + one `register()` call. No `if/else` chains to touch.
- Routes depend on the *interface*, never concrete classes — easy to mock in tests.
- Only the configured provider is instantiated (keys aren't loaded for unused providers).

Note the asymmetry: LLM providers are registered as **instances** (they hold the API key), stores as **factories** (a fresh store is created per request — see [08-design-decisions.md](./08-design-decisions.md)).

`EmbeddingRegistry` (`services/embeddings/registry.ts`) exists but is currently **scaffolding** — nothing registers into it; embeddings come from `provider.embed()`.

## Layered responsibilities

| Layer | Folder | Rule of thumb |
|-------|--------|---------------|
| Types (contracts) | `src/types.ts` | Pure interfaces, zero runtime code. Read this first when lost. |
| HTTP | `src/server/routes/` | Validate input, call services, shape responses. No business logic. |
| Services | `src/server/services/` | The actual work (ingestion, chat orchestration, providers, stores). |
| Utilities | `src/utils/` | Pure, reusable functions (chunking, parsing, hashing) with no server knowledge. |
| UI | `src/component.tsx` | One file: state + SSE parsing + rendering. Talks only HTTP. |

## Dependencies and why they're there

| Package | Role |
|---------|------|
| `express`, `cors` | HTTP server; CORS lets the browser (different port) call the API |
| `better-sqlite3` | Synchronous SQLite driver — default persistent vector store |
| `pdf-parse` | Extract text from PDFs |
| `mammoth` | Extract text from `.docx` |
| `react-markdown` | Render assistant replies as markdown |
| `chromadb` (optional) | Client for the ChromaDB vector server, loaded only on demand |
| `react`/`react-dom` (peer) | Provided by the *host app*, never bundled |

## Build system

The repo root uses `tsdown` for a library build; the publishable package uses `tsup` with the three targets in the table above. Tests run on `vitest` (config: `vitest.config.ts`, pattern `packages/*/tests/**/*.test.{ts,tsx}`).

