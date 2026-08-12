# Improvements — Sijo Thomas Portfolio

**Goal:** Evolve the static Astro portfolio into a full-stack, AI-powered site with a working contact backend, a live "chat with my resume" RAG demo, and production-grade CI/testing/observability — proving AI/ML engineering depth, not just design.

## TL;DR — Path to production
- [x] Working contact backend (edge function, validation + spam protection)
- [x] Vitest + Playwright + Lighthouse CI in the pipeline
- [ ] "Chat with my resume" RAG demo (embeddings, vector store, streaming endpoint, chat UI)
- [ ] Rate limiting, error tracking, privacy-first analytics
- [x] Project/blog search, tag pages, richer case studies

## Current state
- Mature static Astro 5 + Tailwind 4 site: homepage sections, projects + blog content collections, RSS, sitemap, dark mode, strong a11y conventions (CLAUDE.md).
- Deployed to GitHub Pages via GitHub Actions (build + deploy jobs); a hybrid (`ADAPTER=node`) build target also exists for hosts that can run server code — see `docs/DEPLOYMENT.md`.
- Contact form has a real, provider-agnostic backend (`src/api-routes/contact/route.ts`): zod validation, honeypot, in-memory rate limiting, sends via Resend or SMTP from env vars (`src/lib/mailer.ts`), and falls back to a documented `mailto:` link when no provider is configured or the deployment is static (GitHub Pages). Contact-form rate limiting is done; error tracking and analytics are not (tracked below).
- Projects and blog listings have client-side keyword search + tag filtering (`src/components/SearchBox.astro`) backed by a build-time `/search-index.json` index — zero JS everywhere else on the site.
- Vitest + Playwright (including contact-form validation states and search/filter) + axe-core a11y checks + Lighthouse CI budgets all run in CI and pass locally.
- No RAG chat demo, no error tracking/analytics yet — see `docs/AI_CHAT_PLAN.md` for the RAG design (deliberately not built: needs paid API keys + hosting).

## Key improvements
- **Live AI demo (headline feature):** "Chat with my resume/projects" — RAG over the project + blog Markdown, streaming answers. This is the resume-worthy centerpiece for an AI/ML engineer.
- **Real API layer:** serverless functions for the contact form (validation + spam/rate limiting) and the RAG chat endpoint, replacing Formspree.
- **Testing:** unit tests for utils, component tests for Astro islands, Playwright E2E for nav/theme/contact/chat, plus a11y assertions.
- **Observability + quality gates:** Lighthouse CI budgets in the pipeline, error tracking, and usage analytics on the demo.
- **Content/UX depth:** searchable/filterable projects + blog, tag pages, and richer per-project case-study metrics.

## Latest tech to showcase
- Astro server islands / hybrid rendering + an edge runtime (Cloudflare Workers or Vercel) for the API.
- RAG stack: a vector store (pgvector or LibSQL/Turso) + an LLM SDK with streaming (Anthropic/OpenAI) and embeddings.
- Playwright + Vitest + axe-core for testing and accessibility.
- Lighthouse CI, and Sentry + a privacy-first analytics tool (Plausible/PostHog).
- Containerized API (Docker) with typed contracts (Zod) shared across front/back end.

## Roadmap
1. **Foundation:** wire a real contact backend (edge function), add Vitest + Playwright + Lighthouse CI into the existing GitHub Actions.
2. **AI centerpiece:** build the RAG chat demo (embed content, vector store, streaming edge endpoint, chat UI island) with rate limiting + observability.
3. **Polish + scale:** project/blog search + tag filtering, richer case studies, analytics dashboards, and a hybrid-render migration off pure static where needed.
