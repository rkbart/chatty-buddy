# 05 — Services Reference

The "engine room": LLM providers, vector stores, registries, and the ingestion service.

## Registries

### `ProviderRegistry` — `services/llm/registry.ts`

A thin wrapper over `Map<string, LLMProvider>` exposed as the **singleton** `registry`.

| Method | What it does |
|--------|--------------|
| `register(provider)` | Stores by `provider.id` (last one wins) |
| `get(id)` | Returns the provider or `undefined` |
| `list()` / `has(id)` | Introspection (used by `/api/providers`) |

### `VectorStoreRegistry` — `services/stores/registry.ts`

Stores **factories** (`VectorStoreFactory = { id, name, create(cfg) => VectorStore }`), singleton `vectorRegistry`.

| Method | What it does |
|--------|--------------|
| `register(factory)` | Adds a factory |
| `create(id, cfg)` | Calls the factory → a **new store instance** per call; throws `Unknown vector store: id` if unregistered |
| `list()` / `has(id)` | Introspection (used by `/api/stores`) |

### `EmbeddingRegistry` — `services/embeddings/registry.ts`

Same `Map` pattern, singleton `embeddingRegistry`. Currently unused scaffolding for a future design where chat-LLM and embedding-model are separate pluggables.

---

## LLM providers (`services/llm/`)

Every provider implements `LLMProvider` from `src/types.ts`:

```ts
interface LLMProvider {
  id: string; name: string; models: ModelInfo[];
  requiresApiKey: boolean; isLocal: boolean;
  chat(messages, options): AsyncGenerator<string>;  // streaming
  embed?(texts: string[]): Promise<number[][]>;     // optional
}
```

If `embed` is absent, the system silently runs **without RAG** (ingestion skips storing; chat skips retrieval). This applies to **Anthropic** and **Google** — they support chat but not embeddings, so they run without RAG unless paired with a separate embedding-capable provider.

### Provider implementations

| Provider (`id`) | Chat endpoint | Streaming format | `embed()` | Notes |
|------------------|---------------|------------------|-----------|-------|
| `NvidiaProvider` (`nvidia`) | `https://integrate.api.nvidia.com/v1/chat/completions` | OpenAI-style SSE: lines `data: {...}`, token at `choices[0].delta.content`, `[DONE]` sentinel | Yes — `/v1/embeddings`, model `nvidia/nemotron-3-embed-1b`, all texts in **one request** | Auth: `Authorization: Bearer <key>` |
| `OllamaProvider` (`ollama`) | `http://localhost:11434/api/chat` | **NDJSON**: one JSON object per line, `message.content` | Yes — `/api/embeddings`, model hardcoded `nomic-embed-text`, **one request per text** (sequential loop) | No key; `isLocal`; base URL overridable via constructor `baseUrl` |
| `OpenAIProvider` (`openai`) | OpenAI `/v1/chat/completions` | OpenAI SSE (same parser as NVIDIA) | Yes — `/v1/embeddings` | — |
| `AnthropicProvider` (`anthropic`) | `https://api.anthropic.com/v1/messages` | Anthropic SSE; **system prompt passed as top-level `system` field**, not as a message | No — RAG silently disabled | Auth headers: `x-api-key` + `anthropic-version` |
| `GoogleProvider` (`google`) | `https://generativelanguage.googleapis.com/v1beta/models/...` | Gemini `streamGenerateContent`; **system prompt becomes `systemInstruction`**; roles mapped `assistant`→`model` | No — RAG silently disabled | Auth: `?key=<GEMINI_API_KEY>` query param |

**The streaming-parse pattern** (identical shape in every `chat()`):

```ts
async *chat(messages, options) {          // async generator
  const res = await fetch(ENDPOINT, { method: 'POST', body: JSON.stringify({...}) });
  if (!res.ok) throw new Error(`${Provider} API error: ${res.status} ...`);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // parse `value` into text pieces and:
    yield piece;                          // ← hand one piece to the caller
  }
}
```

The route does `for await (const chunk of provider.chat(...))` and writes SSE — so backpressure flows naturally and memory stays flat regardless of answer length.

`ChatOptions` mapping: `temperature`, `maxTokens` (→ `num_predict` for Ollama, `maxOutputTokens`-style fields elsewhere), `topP`.

---

## Vector stores (`services/stores/`)

All implement `VectorStore` from `types.ts`: `init / add / query / delete / clear / stats / destroy`, plus optional `saveDocument` (and extra methods on the SQLite class).

### `SQLiteStore` — the default, most instructive implementation

- **Schema** (created idempotently in `init`):
  ```sql
  documents(filename PK, hash, ingested_at, chunk_count, file_size)
  chunks(id PK, filename FK→documents ON DELETE CASCADE, chunk_index,
         content, embedding BLOB, metadata TEXT)
  CREATE INDEX idx_chunks_filename ON chunks(filename);
  ```
- `init` opens `./.chatty-buddy/data.db` (configurable via `VectorStoreConfig.path`), enables **WAL mode** (`journal_mode = WAL`) for safe concurrent reads.
- **Embeddings are stored as BLOBs**: `float32ToBuffer()` packs `number[]` into a 4-byte-per-float `Buffer`; `bufferToFloat32()` reverses it. Compact and exact — JSON floats would bloat the DB ~2×.
- `add()` wraps all inserts in one `better-sqlite3` **transaction** (fast: one disk sync per file, not per chunk).
- `query()` is **brute-force k-NN**: `SELECT` every row (optionally `WHERE filename = ?`), compute `cosineSimilarity` in JS, sort **descending**, `slice(0, topK)`. Note: the field is called `distance` but holds *similarity* (higher = better).
- `saveDocument/getDocument/deleteDocument/getAllDocuments` maintain the parent `documents` table — required because `chunks.filename` is a real FOREIGN KEY.
- `destroy()` closes the DB handle.

### `InMemoryStore`

`Map<collection, Vector[]>` with the same cosine sort. `isPersistent=false`. Perfect for unit tests (see `tests/stores/inmemory.test.ts`) and ephemeral demos; data vanishes on restart.

### `ChromaDBStore` (`chromadb.ts`)

Adapter over the `chromadb` npm client (an **optionalDependency** — skipped at install unless present). Selected via `--vector-store chromadb`; the CLI imports it lazily so `better-sqlite3`-only users never pay for it.

---

## Ingestion service (`services/ingestion.ts`)

| Export | Purpose |
|--------|---------|
| `ingestDocuments(config, force=false)` | The pipeline from [03, Flow 4](./03-request-flow.md); returns `IngestResult` |
| `listDocuments(config)` | Manifest → `{ filename, hash, ingestedAt, chunks, size }[]` |
| `deleteDocument(config, filename)` | Vectors + manifest cleanup for one file |
| `deleteVectorsForFile(store, filename)` (private) | Filter-query + delete-by-ids workaround |

