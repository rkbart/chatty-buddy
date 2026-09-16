# 06 — Utilities Reference

Pure, dependency-light modules in `src/utils/`. No Express, no globals — the easiest code in the repo to read and test first.

## `chunker.ts` — `chunkText(text, filename, chunkSize=500, chunkOverlap=50): Chunk[]`

Splits long text into overlapping chunks while trying to respect sentence boundaries.

Algorithm:
1. Take `text.slice(start, start + chunkSize)` as the candidate chunk.
2. Unless this is the final chunk, look for the **last `.`** or **last `\n`** in the candidate; whichever is later is the candidate break point.
3. Only accept the early break if it's past **70%** of `chunkSize` (`breakPoint > chunkSize * 0.7`) — this avoids tiny fragments.
4. Emit `Chunk { id: `${filename}-${chunkIndex}`, content, metadata: { filename, chunkIndex, startOffset, endOffset } }`.
5. Next `start = actualEnd - chunkOverlap` (overlap keeps boundary sentences in both chunks).

Chunk ids are stable per file (filename + index), which is why the SQLite store can `INSERT OR REPLACE` them on re-ingest.

## `parsers.ts` — `parseDocument(file: Buffer, filename)` / `isSupportedFile(filename)`

| Extension | Extraction method |
|-----------|-------------------|
| `.txt`, `.md`, `.csv` | Raw UTF-8 decode |
| `.pdf` | `pdf-parse` |
| `.docx` | `mammoth.extractRawText` |
| `.html` | Strip `<script>`/`<style>` blocks, then strip all tags, then collapse whitespace (regex chain) |
| anything else | Throws `Unsupported file type` — caught per-file by ingestion |

Returns `ParsedDocument { content, metadata: { filename, type, size, parsedAt } }`. `isSupportedFile` is the allow-list used to filter the docs directory: `['pdf','docx','txt','md','html','csv']`.

## `manifest.ts` — change detection bookkeeping

| Export | Purpose |
|--------|---------|
| `Manifest` / `ManifestFile` | `{ version, lastScan, files: Record<filename, { hash, ingestedAt, chunks, size }> }` |
| `loadManifest(dataDir)` | Reads `<dataDir>/manifest.json` or returns a fresh manifest |
| `saveManifest(dataDir, m)` | `mkdir -p` + pretty-printed JSON write |
| `calculateFileHash(buffer)` | **SHA-256** hex digest — content identity |
| `hasFileChanged(m, filename, hash)` | True when the file is new or its hash differs |
| `getIngestedFiles(m)` | Keys of `files` — used to spot deletions |
| `addFileToManifest` / `removeFileFromManifest` | Mutate and refresh `lastScan` |

The manifest is the **source of truth for "what has been ingested"**, independent of the vector store — that's why listing documents works even if you swap stores. Cost: two places must stay in sync (see [08-design-decisions.md](./08-design-decisions.md)).

---

## Testing notes for utils

`tests/utils/manifest.test.ts` covers hash/change/detect logic — good examples of how to test pure functions. The chunker is also very testable: feed a string, assert chunk boundaries and ids.

