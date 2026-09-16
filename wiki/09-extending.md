# 09 — Extending & Contributing

## How to add a new LLM provider (e.g. Mistral)

**Step 1 — create the file** `packages/chatty-buddy/src/server/services/llm/mistral.ts` (copy `nvidia.ts` as a template):

```ts
import type { LLMProvider, Message, ChatOptions, ModelInfo } from '../../types.ts';

export class MistralProvider implements LLMProvider {
  id = 'mistral';
  name = 'Mistral';
  models: ModelInfo[] = [ /* { id, name, maxTokens, supportsStreaming, supportsEmbeddings } */ ];
  requiresApiKey = true;
  isLocal = false;

  constructor(private config: { apiKey: string; model?: string }) {}

  async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<string> {
    // 1. fetch(ENDPOINT, { method:'POST', headers: { Authorization: `Bearer ...` }, body })
    // 2. if (!res.ok) throw
    // 3. read the stream with getReader() + TextDecoder
    // 4. yield each text piece
  }

  async embed(texts: string[]): Promise<number[][]> { /* optional */ }
}
```

**Step 2 — register it** in **both** entry points that register providers:
- `bin/server.ts` (add a `case 'mistral':` to the switch)
- `src/server.ts` (`registerProviders` switch)

Optionally export it from `src/index.ts` so library users can construct it.

**Step 3 — test it**: add `tests/providers/mistral.test.ts` (see `nvidia.test.ts` — it stubs `fetch`), run `pnpm test`, and try it live: `--provider mistral --api-key ...`.

That's it — `chat.ts`, ingestion, and the component need **zero changes**.

## How to add a new vector store (e.g. Qdrant)

1. Create `services/stores/qdrant.ts` implementing `VectorStore` (`init/add/query/delete/clear/stats/destroy`; implement `saveDocument` too if you want FK-style parent records).
2. Register a factory in `bin/server.ts` (and `src/server.ts` if you want the embedded demo to see it) — mirror the lazy `chromadb` block if the client should be optional.
3. Users select it with `--vector-store qdrant` or `{ "vectorStore": "qdrant" }`.
4. Add `tests/stores/qdrant.test.ts`; `inmemory.test.ts` is your template.

## How to support a new document type

Edit `src/utils/parsers.ts` only — two functions: add a `case` in `parseDocument` and add the extension to the `isSupportedFile` array. Ingestion picks it up automatically.

## Configuration cheat sheet (where does a value come from?)

Precedence: **CLI args > env vars > `.chatty-buddy.json` > defaults** (implemented by spread order in `resolveConfig`, `src/server/config.ts`).

## Running & testing

```bash
pnpm install                 # pnpm workspace
pnpm test                    # vitest run (packages/*/tests/**/*.test.{ts,tsx})
pnpm test:watch              # watch mode
pnpm lint                    # oxlint
pnpm typecheck               # tsc -b tsconfig.json  (see note below)
pnpm build                   # build:lib (tsc + tsdown) then build:web (vite)
cd packages/chatty-buddy && pnpm build   # tsup → the three dist bundles
```

> ⚠️ **Known repo issue:** the root `typecheck` script references `tsconfig.json`, which doesn't exist at the root (only `tsconfig.base.json` does). Until fixed, typecheck the package instead: `cd packages/chatty-buddy && npx tsc -p tsconfig.json --noEmit`.

### Test layout

```
packages/chatty-buddy/tests/
├── setup.ts                  # shared setup
├── providers/                # nvidia.test.ts, ollama.test.ts (fetch stubbing)
├── stores/                   # inmemory.test.ts
└── utils/                    # manifest.test.ts
```

Testing patterns already in use: stub global `fetch` for providers, pure-function tests for utils, interface-level tests against `InMemoryStore`. Untested areas that would make great first PRs: `chunker.ts`, `SQLiteStore` (temp-file DB), `ingestDocuments` end-to-end, the SSE format of the chat route, and the React component (vitest + @testing-library/react).

## Build outputs (what lands in `packages/chatty-buddy/dist/`)

| File | From | Purpose |
|------|------|---------|
| `browser.js/.cjs/.d.ts`, `browser.css` | `src/browser.ts` | The React component + styles |
| `index.server.js` | `src/index.ts` | Full library for Node embedding |
| `server.cli.js` | `bin/server.ts` | The `chatty-buddy-server` bin (shebang via tsup banner) |

The `files: ["dist", "src"]` field means published packages ship both compiled output and sources (sources are useful for the `.ts`-import style).

## Contribution workflow

1. Read `CONTRIBUTING.md` at the repo root.
2. Branch → small PR → `pnpm lint && pnpm test` green.
3. Commits are enforced by `lefthook.yml` (conventional-commit style) and formatting by `.editorconfig`.

## Good first issues (from the wiki's analysis)

- Create the missing root `tsconfig.json` (fixes `pnpm typecheck`).
- Unify vector-store defaults/registration between `bin/server.ts` and `src/server.ts`.
- Add `deleteByMetadata(filter)` to `VectorStore` and replace the query-and-delete workaround.
- Add a minimal API-key middleware (opt-in) for the server.
- Add chunker + SQLite store + ingestion tests.
