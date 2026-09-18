# 07 — UI Component (`src/component.tsx`)

One self-contained React function component: **`<RagChatbot />`** (~230 lines + `styles.css`). It owns the entire chat UX: connection detection, message state, SSE parsing, markdown rendering.

## Props (from `RagChatbotProps` in `types.ts`)

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `apiUrl` | `string` | `http://localhost:3000` | Backend base URL (no trailing slash needed) |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left' \| 'full'` | `bottom-right` | CSS class `rag-chatbot--{position}` |
| `theme` | `'light' \| 'dark'` | `light` | CSS class `rag-chatbot--{theme}` |
| `title` | `string` | `AI Assistant` | Header text |
| `primaryColor` | `string` | `#007bff` | Set as CSS var `--primary-color` |
| `placeholder` | `string` | `Ask me anything...` | Input placeholder |
| `showAbout` | `boolean` | `true` | Show ⓘ About button in header |
| `buyMeACoffeeUrl` | `string` | `https://buymeacoffee.com/rkbart` | Support link in About panel (`''` hides it) |
| `githubUrl` | `string` | `https://github.com/rkbart/chatty-buddy` | Repo link in About panel (`''` hides it) |
| `about` | `string` | - | Custom About panel text |
| `className`, `style` | — | — | Escape hatches for host apps |
| `onMessage` | `(msg: Message) => void` | — | Fired with each *complete* assistant reply |

## Internal state

| State | Meaning |
|-------|---------|
| `isOpen` | Widget toggle (floating 💬 button ↔ chat window) |
| `messages` | The conversation (`Message[]`), including the streaming assistant bubble |
| `input` | Controlled input value |
| `isLoading` | A request is in flight (shows typing dots, disables input) |
| `serverError` | Set when `/health` fails → banner with "Start the server with: npx chatty-buddy-server" |
| `isIngesting` | True while the mount-time ingest POST runs ("📚 Indexing...") |
| `isConnected` | `/health` succeeded |

## Behaviors, effect by effect

1. **On mount (`apiUrl` dep)** — `fetch(`${apiUrl}/health`)`. If OK: `isConnected=true`, then `POST /api/documents/ingest` (belt-and-braces ingest; the server already auto-ingests on boot — see [08-design-decisions.md](./08-design-decisions.md)). If the fetch throws: `serverError` message.
2. **On `messages` change** — `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })` (auto-scroll).
3. **On open** — focus the input.

## `handleSend()` — sending a message and consuming SSE

```ts
1. Guards: non-empty input, not already loading, isConnected.
2. Optimistic UI: append user message, clear input, setIsLoading(true).
3. fetch(`${apiUrl}/api/chat`, { method:'POST', body: { messages: [...messages, userMessage] } })
4. Append an EMPTY assistant message — this bubble is filled as tokens arrive.
5. Read response.body with getReader() + TextDecoder (same pattern as providers):
     for each line starting with 'data: ':
       data === '[DONE]'  → stop
       JSON.parse → append parsed.content to the last assistant message
   (invalid JSON lines are skipped; short chunks that split a 'data: ' line
    are tolerated because the parser only reacts to lines that start correctly)
6. Call onMessage({ role:'assistant', content }) once, with the FULL text.
7. On error: append "Sorry, an error occurred. Please try again."
8. finally: setIsLoading(false)
```

Why a streaming bubble matters: the user sees tokens appear in real time — perceived latency drops from "seconds of nothing" to "instant typing".

## Rendering details

- Assistant bubbles render through **`<Markdown>` (react-markdown)** → code blocks, lists, tables work. User bubbles are plain text (no injection surface).
- Empty conversation → welcome message ("👋 Hi! Ask me anything about your documents.").
- While loading with no assistant tokens yet → three-dot typing animation (`.rag-chatbot__typing`).
- Widget shell classes follow a BEM-ish convention: `rag-chatbot`, `rag-chatbot__toggle`, `rag-chatbot__window`, `rag-chatbot__header`, `rag-chatbot__messages`, `rag-chatbot__message--user/--assistant`, `rag-chatbot__input`, plus modifiers `--{position}` and `--{theme}`. Theming flows through one CSS variable: `style={{ '--primary-color': primaryColor }}`.
- Accessibility touches: `aria-label` on toggle buttons, disabled states on input/send while loading or errored.

## The browser entry (`src/browser.ts`)

```ts
import './styles.css';                 // side-effect import → emitted as browser.css
export { RagChatbot } from './component.tsx';
export type { Message, ChatOptions, RagChatbotProps } from './types.ts';
```

That's the whole file — and its whole job: guarantee the published browser bundle contains **only** React-facing code. Host apps import it as `@chatty-buddy/react` and styles as `@chatty-buddy/react/styles.css` (see the `exports` map in `packages/chatty-buddy/package.json`).

