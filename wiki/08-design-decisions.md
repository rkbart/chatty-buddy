# 08 — Design Decisions (the "why" behind the code)

Each decision: **what** the code does, **why**, and the **trade-off** to be aware of. These are the conversations reviewers will have with you.

## D1. Registry + interface pattern for providers and stores

- **What:** `LLMProvider` / `VectorStore` interfaces, `Map`-based singletons `registry` / `vectorRegistry`, one registration site at startup.
- **Why:** Adding e.g. a `MistralProvider` is one new file + one `register()` call; `chat.ts` never changes. Routes depend on abstractions, so tests can inject fakes. Also, only the configured provider is instantiated, so unused API keys aren't loaded.
- **Trade-off:** Two registration styles coexist (providers = **instances** because they hold config; stores = **factories** because a fresh store is created per request). Slightly confusing at first — document any new entry point.

## D2. SSE (Server-Sent Events) instead of WebSockets

- **What:** Chat responses stream as `data: {...}` lines over a plain POST response.
- **Why:** One-directional server→client text is all that's needed; SSE works through most proxies (the `X-Accel-Buffering: no` header exists specifically for nginx), needs no socket server or sticky sessions, and `fetch` + `getReader()` suffices on the client.
- **Trade-off:** No push outside a request lifecycle; a broken connection mid-stream isn't retried (the widget shows an error bubble).

## D3. SQLite as the default vector store (no external DB)

- **What:** `better-sqlite3` file DB at `./.chatty-buddy/data.db`; WAL mode; embeddings as float32 BLOBs; cosine similarity computed in JS.
- **Why:** Beginners get persistence with **zero infrastructure** — no Docker, no account. `better-sqlite3` is synchronous, keeping transactional inserts simple and fast.
- **Trade-off:** k-NN search is **brute-force** (full scan per query). Great to ~10k–100k chunks; beyond that latency grows linearly — that's what ChromaDB is for.

## D4. `manifest.json` alongside the vector store (double bookkeeping)

- **What:** Ingestion state (per-file SHA-256 hash, chunk count, size) lives in a JSON file, not only in the DB.
- **Why:** Survives store swaps; makes `GET /api/documents` trivial (no DB access); keeps change-detection logic pure and unit-testable (`tests/utils/manifest.test.ts`).
- **Trade-off:** Manifest and DB can drift if a write fails between `store.add()` and `saveManifest()`. `?force=true` re-ingest is the manual repair. (SQLite partially mitigates: the `documents` table duplicates the same metadata.)

## D5. Delete-by-filter workaround (`deleteVectorsForFile`)

- **What:** To remove a file's vectors, it queries with `embedding: [0]`, `topK: 10000`, `filter: { filename }`, then `store.delete(ids)`.
- **Why:** The `VectorStore` interface has no `deleteWhere(metadata)` — this keeps the interface minimal and works across all three stores.
- **Trade-off:** Full scan per delete and a silent 10,000-chunk cap per file. Cleaner fix: extend the interface with `deleteByMetadata(filter)` (SQLite already has the exact `DELETE FROM chunks WHERE filename = ?` query internally).

## D6. A new store instance per request (in `chat.ts` / `deleteDocument`)

- **What:** `vectorRegistry.create(...)` + `store.init()` run on **every** chat request, not once at startup.
- **Why:** Routes stay stateless; simple to reason about.
- **Trade-off:** A file open + table check per request — fine for SQLite (µs), wasteful for remote stores like Chroma (network handshake per message). Easy improvement: cache one instance at module level.

## D7. Lazy `chromadb` import in the CLI

- **What:** `bin/server.ts` registers `sqlite` up-front and does `await import('.../chromadb.ts')` only when `config.vectorStore === 'chromadb'`.
- **Why:** `chromadb` is an optionalDependency; lazy loading means the default path never parses it — fewer install/startup failure modes.
- **Trade-off:** Entry-point asymmetry: `src/server.ts` (env-driven demo) registers `chromadb` + `inmemory` and defaults to `chromadb`; the CLI registers `sqlite` and defaults to `sqlite`. Unifying this is a good first contribution.

## D8. Embeddings come from the chat provider (`provider.embed`)

- **What:** One object does both chat and embeddings; RAG silently disables when `embed` is missing.
- **Why:** Simple mental model, fewer config knobs; most built-in providers expose embeddings (Anthropic and Google do not, so RAG is silently disabled for them).
- **Trade-off:** Can't mix (e.g. local chat + cloud embeddings) — the gap `EmbeddingRegistry` was scaffolded for. Ollama hardcodes `nomic-embed-text` and embeds sequentially, one request per text. Switching embedding models mid-life **invalidates existing vectors** (dimension mismatch) — re-ingest with `?force=true`.

## D9. "distance" that is actually a similarity

- **What:** `QueryResult.distance` holds cosine **similarity** (higher = more similar) in SQLite and in-memory stores.
- **Why:** Both implementations share the same helper and semantics.
- **Trade-off:** Misleading name, and semantics differ from real distances in ChromaDB. If you filter by score, know which store you're on.

## D10. `.ts` extension imports + ESM everywhere

- **What:** All relative imports end in `.ts` (`from './types.ts'`), `"type": "module"`.
- **Why:** Runs natively under Node 18+ / tsx; bundlers resolve it cleanly.
- **Trade-off:** Requires a bundler or tsx to execute TS directly.

## Known limitations (be aware before deploying)

1. **Wide-open CORS** (`app.use(cors())`) and **no authentication** on any route — fine for localhost, not for a public host. Anyone can chat (spending your API credits) or `DELETE /api/documents/*`.
2. **API key in `.chatty-buddy.json`** is plaintext; prefer `RAG_API_KEY` env vars and never commit the file.
3. **Ingestion is sequential** (await per file / per embed batch) — fine for small doc sets; a worker queue is the scale path.
4. **Duplicate auto-ingest triggers**: server boot *and* widget mount both call ingest (idempotent thanks to hashing, but two HTTP calls).
5. **Build tooling duplication**: root `tsdown` vs package `tsup`; and the root `package.json` `typecheck` script references a root `tsconfig.json` that doesn't exist (only `tsconfig.base.json` + the package's own tsconfig).
6. **Test coverage** focuses on providers/stores/manifest; the chat route, ingestion pipeline, and React component are untested.

Each limitation is a self-contained, beginner-sized contribution opportunity.

