# "Chat with my resume/projects" — RAG demo design

**Status: not built.** This is a concrete implementation plan for the
headline feature in `IMPROVEMENTS.md`, deliberately not implemented in
this phase because it needs a paid LLM API key, an embeddings API key
(or a self-hosted model), and hosting that can run a persistent/edge
server — none of which belong in an unattended agent phase that must
not spend money, touch external accounts, or deploy anywhere. This doc
is the spec to build it against once those prerequisites are available.

## Goal

A chat box on the site where a visitor (recruiter, hiring manager,
engineer) can ask natural-language questions — "What ML frameworks has
Sijo used in production?", "Tell me about the RAG project", "What's his
experience with time series forecasting?" — and get an answer grounded
in the actual project/blog content, with citations linking back to the
source page. It should be impossible for it to fabricate experience: if
the corpus doesn't support an answer, it says so.

## Why RAG over a bare LLM call

The corpus is small (currently 4 projects + 3 blog posts + an About/
Experience section, ~275 lines of markdown total) — small enough to
stuff entirely into a single prompt with no retrieval step at all.
Retrieval is still the right design because:
- It keeps token cost and latency low as the corpus grows (more
  projects/posts over time) without ever touching the prompt-engineering
  layer.
- It lets us cite the exact source page per answer (chunk → source URL),
  which is the trust-building part of the demo — visitors can click
  through and verify.
- It's the "proves ML engineering depth" part of the roadmap; a
  full-context prompt wouldn't visibly demonstrate anything.

## Architecture

```
Build time                          Request time (edge/serverless function)
───────────                         ────────────────────────────────────────
content collections (projects+blog) 
        │                            visitor question
        ▼                                   │
  chunk + embed script                      ▼
   (scripts/build-embeddings.mjs)     embed the question (same model)
        │                                   │
        ▼                                   ▼
  embeddings.json  ───committed───►   load embeddings.json (bundled)
  (or vector DB seed)                       │
                                             ▼
                                     cosine similarity, top-k chunks
                                             │
                                             ▼
                                     build prompt: system instructions
                                     + top-k chunks (with source URLs)
                                     + conversation history + question
                                             │
                                             ▼
                                     stream completion from LLM
                                             │
                                             ▼
                                     SSE/stream back to the chat island
                                             │
                                             ▼
                                     render answer + "Sources" links
```

### Why a flat JSON file instead of a hosted vector DB (at this scale)

With a few dozen chunks, brute-force cosine similarity over a JSON
array loaded into memory is faster to build, has zero infra cost, and
is fast enough (sub-millisecond) at request time. This is the same
"build-time index, filter in memory" pattern already used for
`/search-index.json` (see `src/pages/search-index.json.ts`) — reuse
that convention rather than introducing a new one. Revisit only if the
corpus grows past roughly 500–1,000 chunks (a personal portfolio won't):
at that point swap `embeddings.json` for Turso/libSQL with the
`sqlite-vec` extension (or pgvector on a small Postgres instance) behind
the same `retrieve(query): Chunk[]` interface, so nothing above the
storage layer changes.

## Content pipeline

1. **Source**: existing content collections (`projects`, `blog`) plus a
   new small `about.md` capturing the Experience/Skills/Education
   sections currently hardcoded in `src/components/sections/*.astro` —
   chat needs those as citable prose, not just component props.
2. **Chunking**: split each markdown body by heading (`##`) into
   chunks of roughly 200–400 tokens, each chunk keeping: source type
   (`project`/`blog`/`about`), source id, source URL (`withBase(...)`,
   same helper the site already uses), heading path, and raw text.
   Reuse `src/utils/readingTime.ts`'s markdown-stripping approach for
   token estimation, don't add a new tokenizer dependency for that part.
3. **Embedding**: one batch call per build to an embeddings API
   (`text-embedding-3-small` via OpenAI, or Anthropic + a dedicated
   embeddings provider like Voyage AI, since Claude itself doesn't
   serve embeddings) — see `docs/../CLAUDE.md`-style provider note
   below. Small enough corpus that a full re-embed on every content
   change is fine; no incremental-diffing complexity needed.
4. **Output**: `src/generated/embeddings.json` (gitignored, produced by
   a `prebuild:chat` npm script), an array of
   `{ id, sourceType, sourceId, url, heading, text, embedding: number[] }`.
   Bundled into the server function at build time exactly like
   `search-index.json.ts` is prerendered today.

## Runtime endpoint

New route: `src/api-routes/chat/route.ts`, synced into
`src/pages/api/chat.ts` by the same `scripts/sync-api-route.mjs`
pattern already used for `/api/contact` — gated behind `ADAPTER=node`
(or whichever adapter is chosen) so the static GitHub Pages build stays
untouched and the chat UI island simply doesn't render its input if the
route 404s (same progressive-enhancement contract as the contact form).

```ts
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // 1. zod-validate { message: string, history: {role, content}[] }
  // 2. rate limit (reuse src/lib/rateLimit.ts, tighter window — this
  //    call costs real money per request, contact form doesn't)
  // 3. embed the question (same embeddings model as build time)
  // 4. cosine-similarity top-k (k=4–6) against embeddings.json
  // 5. build the prompt:
  //    - system: "Answer only from the provided context about Sijo
  //      Thomas's projects and experience. If the context doesn't
  //      answer the question, say you don't have that information —
  //      never speculate or invent experience."
  //    - context: top-k chunks, each labelled with its source URL
  //    - conversation history (last N turns, capped)
  //    - the question
  // 6. stream the completion back as SSE (or plain chunked text)
  // 7. after the stream ends, append a structured "sources" event
  //    listing the URLs actually used, for the UI to render as links
};
```

## Model choice

Anthropic Claude (Haiku-tier — Claude Haiku 4.5 or whatever the current
cheapest/fastest Claude model is at build time) for the completion:
cheap enough to run per-visitor-question on a personal site, strong
instruction-following for "only answer from context," native
`text/event-stream` support via the Messages API's `stream: true`.
Embeddings need a separate provider since Anthropic doesn't serve an
embeddings endpoint — OpenAI's `text-embedding-3-small` (cheap, good
quality/cost ratio) or Voyage AI (Anthropic's recommended embeddings
partner) are the two candidates; pick whichever the account already has
billing set up for for when this gets built.

Env vars needed (documented here, not created — see
`docs/DEPLOYMENT.md` for the pattern this would follow):
`ANTHROPIC_API_KEY`, `EMBEDDINGS_API_KEY` (OpenAI or Voyage, whichever
is chosen), `CHAT_MODEL` (default pinned in code, override optional).

## Frontend: chat island

`src/components/ChatWidget.astro` — a single small vanilla-JS island
(no framework, consistent with `SearchBox.astro`'s pattern and
CLAUDE.md's zero-JS-by-default rule): a floating button, an expanding
panel with a message list, a text input, and a "Sources" chip row under
each assistant answer. Uses `fetch` with a `ReadableStream` reader to
render tokens as they arrive (no SSE library needed — the Fetch API's
native streaming body is sufficient for one-directional token
streaming). Same progressive-enhancement contract as the contact form:
if `/api/chat` 404s (static build), the widget doesn't render at all —
checked via a HEAD request or simply omitted server-side when the page
is prerendering and the route is known absent (mirrors the existing
`prerender`/adapter gating already used for contact).

## Rate limiting & cost control

- Reuse `checkRateLimit()` from `src/lib/rateLimit.ts` with a tighter
  budget (e.g. 10 messages / hour / IP) since each request costs real
  API spend, unlike the contact form.
- Cap `max_tokens` on the completion (e.g. 400) — answers should be
  concise, not essays.
- Cap conversation history sent per request (last 6 turns) to bound
  prompt size.
- Consider a global daily spend cap via a simple counter (same
  in-memory-bucket pattern, keyed by a constant instead of IP) that
  disables the widget with a friendly "demo is resting for today"
  message once hit — cheap insurance against a runaway crawler or a
  viral HN post.

## Observability

- Log (server-side only, never to the client) each request's token
  usage from the Anthropic response's `usage` field, so cost is
  traceable without a dashboard for v1.
- If/when Sentry or a similar tool is added (see IMPROVEMENTS.md
  roadmap), wrap the route handler so failed completions and rate-limit
  rejections show up there.

## Testing plan (once built)

- **Unit**: chunking function (given markdown, produces expected chunk
  boundaries + metadata), cosine similarity ranking (given known
  vectors, returns expected top-k order), prompt assembly (given
  chunks, produces expected system/context structure) — all pure
  functions, testable without network calls, same Vitest setup already
  in place.
- **E2E (Playwright)**: mock `/api/chat` with `page.route()` to return a
  canned SSE-style stream, assert the widget renders tokens
  progressively and shows source links — no real API key needed in CI,
  matching how `tests/e2e/contact-form.spec.ts` never hits a real mail
  provider either.
- **Manual/staging only**: a small fixed set of "known good" Q&A pairs
  run against the real endpoint before each deploy, to catch prompt
  regressions — not automated in CI (costs money per run).

## Rollout order

1. Add `about.md` content source + chunking script + embeddings build
   script, commit `embeddings.json` generation as a `prebuild:chat`
   step gated the same way `sync-api-route.mjs` gates the contact
   route.
2. Build `/api/chat` against a local `.env` with real keys, verify
   manually.
3. Build `ChatWidget.astro`, wire streaming, verify manually.
4. Add the unit + mocked-E2E tests above.
5. Deploy to a Node-capable host (see `docs/DEPLOYMENT.md` Option B —
   same Docker image, additional env vars) — GitHub Pages remains the
   static fallback with the widget simply absent.
