# Deployment

This site has two build targets, switched by a single environment
variable. Both are produced by the same Astro project — nothing in
`src/` needs to change between them.

| | `npm run build` (default) | `ADAPTER=node npm run build:server` |
|---|---|---|
| Astro `output` | `static` | `server` (hybrid — every page still prerenders except the API route) |
| `/api/contact` route | **absent** — not emitted at all | present, runs on demand |
| Contact form behaviour | client JS posts to `/api/contact`, gets a 404 (route doesn't exist), falls back to a `mailto:` link | client JS posts to `/api/contact`, gets a real JSON response |
| Where it can be hosted | GitHub Pages, any static host/CDN | anywhere that runs Node: Docker, Render, Fly.io, a VPS, Vercel/Netlify (Node runtime) |

See `astro.config.mjs` for the exact switch (`useNodeAdapter = process.env.ADAPTER === 'node'`).

## Why a separate `ADAPTER` flag instead of always using the adapter

GitHub Pages only serves static files — it cannot run the Node process
an adapter needs. Astro's `output: 'static'` mode also **fails the
build outright** (`NoAdapterInstalled`) if any page under `src/pages`
exports `prerender = false` without an adapter configured, even if that
route would never be requested. So the API route source lives outside
`src/pages` (`src/api-routes/contact/route.ts`) and a small pre-build
script, `scripts/sync-api-route.mjs`, copies it into
`src/pages/api/contact.ts` only when `ADAPTER=node` is set, and removes
it otherwise. This keeps `npm run build` (the command GitHub Actions /
`withastro/action` runs) fully static with zero server code, while
`ADAPTER=node npm run build:server` produces a deployable Node server.

```
npm run dev              # static-mode dev server (no /api/contact)
npm run build             # static build for GitHub Pages — no server code emitted
npm run build:server      # ADAPTER=node hybrid build — includes /api/contact
npm run preview           # serve whichever dist/ was last built
```

## Option A — GitHub Pages (current deployment, static only)

`.github/workflows/deploy.yml` already does this: `test` →
`lighthouse` + `build` → `deploy`, using `withastro/action@v3` (which
runs the default `npm run build`) and `actions/deploy-pages`. No
secrets, no server, no additional setup. The contact form falls back to
the `mailto:` link documented below.

## Option B — A host that can run Node, with a real contact API

Any of these work with `ADAPTER=node`. The steps are the same shape
everywhere: build with the adapter, run `node dist/server/entry.mjs`,
set env vars for whichever mail provider you choose (see next
section).

### Docker (works on any container host)

A `Dockerfile` and `docker-compose.yml` are included at the repo root.

```bash
docker build -t portfolio .
docker run -p 4321:4321 \
  -e RESEND_API_KEY=re_xxx \
  -e CONTACT_TO_EMAIL=you@example.com \
  portfolio
```

or

```bash
docker compose up --build
```

`docker-compose.yml` reads the same variables from a local `.env` file
(see `.env.example`) — it is **not** committed and must be created
per-environment.

### Vercel / Netlify / Render / Fly.io / a plain VPS

- Build command: `ADAPTER=node npm run build:server`
- Start command: `node dist/server/entry.mjs`
- Set the mail-provider env vars (below) in the host's dashboard/secret
  store.
- Astro also publishes dedicated adapters (`@astrojs/vercel`,
  `@astrojs/netlify`) if you'd rather target their edge/serverless
  runtimes instead of the Node standalone server used here — swapping
  `@astrojs/node` for one of those in `astro.config.mjs` is the only
  change required; `src/api-routes/contact/route.ts` itself is
  runtime-agnostic (uses `fetch`/env vars only, no Node-specific APIs
  except the optional `nodemailer` SMTP path, which is dynamically
  imported and skipped entirely if `RESEND_API_KEY` is set instead).

## Contact form: provider-agnostic email sending

`src/lib/mailer.ts` picks a provider purely from which env vars are
present — no code changes needed to switch:

| Provider | Required env vars | Optional |
|---|---|---|
| **Resend** (recommended — no SMTP credentials to manage) | `RESEND_API_KEY`, `CONTACT_TO_EMAIL` | `CONTACT_FROM_EMAIL` (defaults to `onboarding@resend.dev`, Resend's sandbox sender) |
| **SMTP** (any provider — Gmail, SES, Mailgun, your own server) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO_EMAIL` | `SMTP_SECURE` (`"true"` to force TLS; auto-true on port 465), `CONTACT_FROM_EMAIL` (defaults to `SMTP_USER`) |
| **None configured** | — | API route returns `503` with a message pointing at the mailto fallback; **the static build never even includes the route** |

Resend is checked first — if `RESEND_API_KEY` **and** `CONTACT_TO_EMAIL`
are both set, SMTP vars are ignored. See `.env.example` for a copy-paste
starting point.

Copy it to `.env` for local hybrid-mode testing:

```bash
cp .env.example .env
# fill in RESEND_API_KEY + CONTACT_TO_EMAIL, or the SMTP_* vars
ADAPTER=node npm run build:server && npm run preview
```

## The mailto fallback (static / no-provider deployments)

When there is no `/api/contact` route at all (GitHub Pages) or the
route exists but no provider env vars are set (503), the contact
page's client script (`src/pages/contact.astro`) opens:

```
mailto:sijo.thomas0097@gmail.com?subject=Portfolio%20contact%20form%20—%20from%20<name>&body=<message>%0A%0A—%20<name>%20(<email>)
```

pre-filled with whatever the visitor already typed. This link is also
shown as a plain, always-visible `<a href="mailto:...">` directly under
the submit button, so the form is fully usable with JavaScript
disabled — the fallback is not solely a JS-driven redirect.

## Rate limiting

`src/lib/rateLimit.ts` is a deliberately minimal in-memory fixed-window
limiter (5 requests / 10 minutes / IP, configured in
`src/api-routes/contact/route.ts`). It resets on cold start and does
not share state across multiple concurrent function instances. That's
an accepted trade-off for a personal contact form — it stops naive
scripted retries without needing Redis/Upstash/KV. If real abuse shows
up in production, swap this module for a durable store keyed the same
way (`checkRateLimit(key, options)`); nothing else in the route needs
to change.

## Honeypot spam protection

The form includes a `company` field, visually hidden (`sr-only`) and
`tabindex="-1"` so sighted users and keyboard/screen-reader users never
encounter it, but naive bots that autofill every input will. The
server (`src/lib/contact.schema.ts` + the API route) silently returns
`{ ok: true }` without sending an email when it's filled in, so bots
get an indistinguishable success response and don't learn to avoid the
field.
