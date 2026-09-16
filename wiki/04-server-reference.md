# 04 — Server Reference

Everything below lives in `packages/chatty-buddy/src/server/`.

## `startEmbeddedServer(config)` — `index.ts`

Creates and runs the Express app. Signature: `(config: RagChatbotConfig) => Promise<ServerInstance>` where `ServerInstance = { port: number; close(): Promise<void> }`.

Order of operations:
1. `app.use(cors())` then `app.use(express.json())`.
2. Mounts the three routers (see below) under `/api`.
3. Adds `GET /health` → `{ status: 'ok', timestamp }`.
4. Picks a port: `config.serverPort` if set, else `findAvailablePort(3000)` — a small recursive helper that tries to `net.createServer().listen(port)`; on bind error it retries with `port + 1`.
5. Listens, then runs `ingestDocuments(config)` once (auto-ingest). Ingest errors are logged, never crash the server.
6. Returns `{ port, close }`. `close()` wraps `server.close()` in a promise (needed because the callback API is old-style).

Being **embeddable** is the point: another Express app can call `startEmbeddedServer()` (or import just the routers via `createChatRouter(config)` etc. from `src/index.ts`) and mount them into its own app.

## Routes

### `routes/chat.ts` — `createChatRouter(config)`

`POST /api/chat` — full walkthrough in [03-request-flow.md](./03-request-flow.md). Validates `messages`, runs RAG retrieval when `provider.embed` exists, then streams SSE `data: {"content":"..."}` chunks terminated by `data: [DONE]`. Errors before headers are sent → JSON 400/500; errors mid-stream just end the stream.

### `routes/documents.ts` — `createDocumentsRouter(config)`

| Endpoint | Handler | Response |
|----------|---------|----------|
| `GET /api/documents` | `listDocuments(config)` — manifest read | `{ documents: [{ filename, hash, ingestedAt, chunks, size }] }` |
| `POST /api/documents/ingest` | `ingestDocuments(config, force)` — `force` from `?force=true` | `IngestResult` (see 03) |
| `DELETE /api/documents/:filename` | `deleteDocument(config, filename)` — filename is URI-decoded first | `{ success: true, deleted }` |

### `routes/config.ts` — `createConfigRouter(config)`

| Endpoint | Response |
|----------|----------|
| `GET /api/config` | `{ provider, providerName, model, vectorStore, documentsPath, hasApiKey, models }` — never leaks the actual key |
| `GET /api/providers` | All *registered* providers with `id, name, requiresApiKey, isLocal, models` |
| `GET /api/stores` | All *registered* store factories with `id, name` |

Note: these list what's **registered in the process**, not what exists in the codebase. The CLI only registers `sqlite` (+ `chromadb` when selected), so `/api/stores` reflects that.

## Config module (`config.ts`)

| Export | Purpose |
|--------|---------|
| `loadConfig(cwd?)` | Reads `.chatty-buddy.json` from cwd; returns `{}` when absent; logs and returns `{}` on parse errors |
| `getConfigFromArgs(args)` | Scans for `--provider, --api-key, --model, --vector-store, --documents, --system-prompt, --temperature, --max-tokens, --port, --data-dir, --embedding-model` |
| `getConfigFromEnv()` | Maps `RAG_*` env vars (full list in 03, Flow 2) |
| `resolveConfig(args)` | Defaults ← file ← env ← args; returns the final `RagChatbotConfig` |

Defaults chosen in `resolveConfig`: provider `nvidia`, model `meta/llama-3.2-11b-vision-instruct`, store `sqlite`, docs `./docs`, temp `0.7`, maxTokens `1024`, port `3000`, dataDir `./.chatty-buddy`.

