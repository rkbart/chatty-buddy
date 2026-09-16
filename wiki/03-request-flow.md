# 03 — Request Flows (step-by-step)

Follow these five flows and you'll have read ~90% of the meaningful code paths.

---

## Flow 1 — Startup (`bin/server.ts`)

```
$ npx chatty-buddy-server --provider nvidia --api-key nvapi-xxx
│
1. resolveConfig(process.argv.slice(2))          # src/server/config.ts
2. switch (config.provider) → registry.register(new NvidiaProvider(...))
3. vectorRegistry.register({ id: 'sqlite', create: cfg => new SQLiteStore(cfg) })
4. startEmbeddedServer(config)                   # src/server/index.ts
   ├── app.use(cors()), app.use(express.json())
   ├── mount chat / documents / config routers under /api
   ├── GET /health → { status: 'ok' }
   ├── findAvailablePort(config.serverPort || 3000)
   │     └─ probes 3000, then 3001, ... by trying to bind a net.Server
   ├── server.listen(port)
   └── ingestDocuments(config)        ← AUTO-INGEST after boot
5. SIGINT/SIGTERM handlers → server.close() → exit(0)
```

Key ideas:
- **Only one LLM provider is registered** — the one you configured. If you forget the API key, registration is skipped and chat later fails with `Unknown provider`.
- **Auto-ingest on boot** means editing a doc in `docs/` then restarting is enough.

## Flow 2 — Config resolution (`src/server/config.ts`)

`resolveConfig(args)` merges four sources; **later spreads override earlier**:

```ts
return {
  provider: 'nvidia', model: 'meta/llama-3.2-11b-vision-instruct',
  vectorStore: 'sqlite', documentsPath: './docs',
  temperature: 0.7, maxTokens: 1024, serverPort: 3000,
  dataDir: './.chatty-buddy',
  ...fileConfig,   // 3rd priority: .chatty-buddy.json in CWD
  ...envConfig,    // 2nd priority: RAG_* environment variables
  ...argsConfig,   // 1st priority: --provider, --api-key, --port, ...
};
```

| Source | Function | Notes |
|--------|----------|-------|
| JSON file | `loadConfig()` | `.chatty-buddy.json` in the current working directory; missing/invalid → `{}` |
| Env vars | `getConfigFromEnv()` | `RAG_PROVIDER`, `RAG_API_KEY`, `RAG_MODEL`, `RAG_VECTOR_STORE`, `RAG_DOCUMENTS_PATH`, `RAG_SYSTEM_PROMPT`, `RAG_TEMPERATURE`, `RAG_MAX_TOKENS`, `RAG_SERVER_PORT`, `RAG_DATA_DIR`, `RAG_EMBEDDING_MODEL` |
| CLI args | `getConfigFromArgs()` | Simple `--name value` scanner (`getArg`) — no parsing library needed |

---

## Flow 3 — A chat message (the core RAG flow)

`POST /api/chat` with body `{ messages: Message[] }`:

```
1. Validate: messages is an array; a user message exists. Else 400.
2. provider = registry.get(config.provider)         # missing → 400
3. store = vectorRegistry.create(config.vectorStore || 'sqlite', ...)
   await store.init({ collection: 'documents' })    # idempotent
4. RAG retrieval (only if provider.embed exists):
   a. queryEmbedding = (await provider.embed([question]))[0]
   b. results = store.query({ collection, embedding, topK: config.topK || 5 })
        SQLite: SELECT all chunks → cosine similarity each → sort desc → slice
   c. contextText = results.map(r => r.document).join('\n\n')
   └─ any error is caught+logged; chat continues WITHOUT context
5. systemMessage = <systemPrompt or default> + "\n\nCONTEXT:\n" + contextText
6. SSE headers: text/event-stream, no-cache, keep-alive, X-Accel-Buffering: no
7. for await (chunk of provider.chat([systemMessage, ...messages], opts)):
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
8. res.write('data: [DONE]\n\n'); res.end()
```

Details worth noticing:

- **The whole conversation** is forwarded; only the *last user message* is embedded. The LLM keeps short-term memory, but retrieval reflects only the newest question.
- **Graceful degradation**: if embeddings or the store fail, the user still gets an LLM answer (without context) instead of a 500.
- `provider.chat` is an **async generator** — `for await` pulls one token-batch at a time from the upstream API and re-streams it immediately. The full answer is never buffered.

---

## Flow 4 — Ingestion (`src/server/services/ingestion.ts`)

Runs at startup, from the widget mount, or via `POST /api/documents/ingest[?force=true]`.

```
1. documentsPath exists? else return empty result
2. files = readdir(documentsPath) filtered by isSupportedFile()  # pdf,docx,txt,md,html,csv
3. store = vectorRegistry.create(...); store.init()
4. manifest = loadManifest(dataDir)
5. DELETED files (in manifest but not on disk):
     deleteVectorsForFile() + removeFileFromManifest() → results.deleted
6. Per file on disk:
   a. hash = calculateFileHash(buffer)                 # SHA-256
   b. !force && !hasFileChanged() → results.skipped, continue
   c. hash changed → deleteVectorsForFile() first → results.updated
   d. parsed = parseDocument(buffer, filename)         # utils/parsers.ts
   e. chunks = chunkText(content, filename, 500, 50)   # utils/chunker.ts
   f. embeddings = provider.embed(chunks.map(c => c.content))
   g. store.saveDocument?.(...)    # SQLite parent row in `documents` (FK target)
   h. store.add({ ids, embeddings, documents, metadatas })
   i. addFileToManifest(...); results.ingested (or updated)
7. saveManifest(dataDir, manifest)
```

**How deletion-by-file works** (`deleteVectorsForFile`) — a documented workaround: the interface has `delete(ids)` but no delete-by-metadata, so the code *queries* vectors with `filter: { filename }`, `embedding: [0]`, `topK: 10000`, then deletes the returned ids. See [08-design-decisions.md](./08-design-decisions.md).

Per-file failures land in `results.errors` — one bad file doesn't abort the batch.

---

## Flow 5 — Delete / list / inspect

| Call | What happens |
|------|--------------|
| `DELETE /api/documents/:filename` | `deleteDocument()`: query-and-delete that file's vectors, remove manifest entry, save manifest. (The physical file stays on disk.) |
| `GET /api/documents` | Reads the manifest only — no vector DB access. |
| `POST /api/documents/ingest` | Flow 4 again; `?force=true` re-embeds everything. |
| `GET /health` | Static OK — the widget's "is the server up?" check. |
| `GET /api/config` | Current provider/model/store; `hasApiKey` boolean (never the key itself). |
| `GET /api/providers`, `/api/stores` | Lists registered implementations. |

