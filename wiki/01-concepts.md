# 01 — Core Concepts (for absolute beginners)

Everything in Chatty-Buddy is built from five ideas. Learn these and the whole codebase becomes readable.

---

## 1. LLM (Large Language Model)

A model like Llama or GPT that takes **text in** and produces **text out**. Chatty-Buddy talks to LLMs through an abstraction called a **provider** (see `src/server/services/llm/`). Each provider wraps one company's HTTP API:

| Provider | Where the model runs | API key needed? |
|----------|---------------------|-----------------|
| `nvidia` | NVIDIA's cloud (`integrate.api.nvidia.com`) | Yes (free tier) |
| `ollama` | **Your own machine** (`localhost:11434`) | No |
| `openai` | OpenAI cloud | Yes |
| `anthropic` | Anthropic cloud | Yes |
| `google` | Google Gemini cloud | Yes |

---

## 2. Embeddings — turning text into numbers

An **embedding** is a list of numbers (a *vector*, e.g. 768 or 1024 floats) that represents the *meaning* of a piece of text. Texts with similar meanings get similar number-lists.

```
embed("How do I reset my password?")  → [0.12, -0.98, 0.44, ...]
embed("What's the password reset?")   → [0.11, -0.95, 0.47, ...]   ← close!
embed("Best pizza toppings")          → [-0.72, 0.03, 0.61, ...]    ← far away
```

Closeness is measured with **cosine similarity**: the dot product of two vectors divided by their lengths — a value from −1 to 1 where 1 means "same meaning". You can see this exact formula in `SQLiteStore.cosineSimilarity()` and `InMemoryStore.cosineSimilarity()`.

---

## 3. Vector store — a database of embeddings

A **vector store** stores many `{id, embedding, document, metadata}` records and can answer: *"which stored records are most similar to this query vector?"* That search is called **similarity search**.

Chatty-Buddy implements the `VectorStore` interface (`src/types.ts`) in three classes:

- **`SQLiteStore`** — files on disk (`.chatty-buddy/data.db`), persistent, default. Similarity search is done **brute-force**: load rows, compute cosine similarity in JS, sort, take top-K.
- **`InMemoryStore`** — same idea but data lives only while the process runs (great for tests).
- **`ChromaDBStore`** — a dedicated vector database you run separately (optional dependency, only loaded if you ask for it).

---

## 4. RAG — Retrieval-Augmented Generation

LLMs don't know *your* documents. RAG fixes that in two phases:

**Phase A — Ingestion (done once per file, then only on changes):**

```
docs/faq.md ─► parse ─► chunk ─► embed each chunk ─► store (vector + text + metadata)
```

**Phase B — Chat (every question):**

```
question ─► embed question ─► similarity search ─► top-K chunks
          ─► build prompt: system prompt + "CONTEXT:\n<chunks>" + conversation
          ─► LLM ─► answer (grounded in your docs)
```

The retrieval step is what makes the answer "know about your documents" — the LLM never sees the files, only the retrieved chunks.

---

## 5. Chunking

Documents can be huge; embedding models and LLM context windows are limited. `src/utils/chunker.ts` splits text into overlapping **chunks** (default 500 chars, 50-char overlap) and tries to break at sentence boundaries (the last `.` or `\n`, but only if that keeps ≥70% of the chunk — see `chunkText()`).

Overlap means a sentence that straddles a boundary appears (partially) in two chunks, so its meaning isn't lost.

---

## 6. SSE — Server-Sent Events (streaming)

LLMs generate text token-by-token. Instead of waiting for the whole answer, the server **streams** it using SSE: an HTTP response with header `Content-Type: text/event-stream` and a body of lines like:

```
data: {"content":"Hello"}

data: {"content":" there"}

data: [DONE]
```

Both sides of this live in the codebase: the chat route *writes* these lines (`src/server/routes/chat.ts`), and the React component *reads* them (`component.tsx`, `handleSend`). SSE is simpler than WebSockets because it's just a normal HTTP response — no extra protocol or library.

---

## 7. Manifest — change detection

To avoid re-embedding every file on every start, `src/utils/manifest.ts` keeps `manifest.json` in the data dir:

```json
{
  "version": 1,
  "lastScan": "2026-09-04T10:00:00Z",
  "files": {
    "faq.md": { "hash": "a3f...", "ingestedAt": "...", "chunks": 12, "size": 5432 }
  }
}
```

`hash` is a **SHA-256** of the file content (`calculateFileHash`). On re-scan: same hash → **skip**; different hash → **delete old vectors, re-ingest**; file gone → **delete vectors + manifest entry**.

---

## Vocabulary cheat sheet

| Term | Meaning in this codebase |
|------|--------------------------|
| **Provider** | Class implementing `LLMProvider` (chat + optional embed) |
| **Store** | Class implementing `VectorStore` (add/query/delete vectors) |
| **Registry** | A `Map` from id → provider/store (dependency injection, see 02) |
| **Chunk** | One overlapping slice of a document, id like `faq.md-3` |
| **topK** | How many similar chunks to retrieve (default 5) |
| **collection** | Logical name for a group of vectors (`"documents"`) |
| **SSE** | `data: ...` lines streamed over plain HTTP |
