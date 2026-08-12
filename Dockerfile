# Hybrid (server) build for hosts that can run Node — see docs/DEPLOYMENT.md.
# NOT used by the GitHub Pages deployment, which builds static output
# directly in CI via withastro/action (see .github/workflows/deploy.yml).
#
# Build:
#   docker build -t portfolio .
# Run:
#   docker run -p 4321:4321 \
#     -e RESEND_API_KEY=re_xxx -e CONTACT_TO_EMAIL=you@example.com \
#     portfolio
# or use docker-compose.yml, which reads the same vars from a local .env.

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN ADAPTER=node npm run build:server

# ---- runtime image: built server + full node_modules from the build stage ----
# Astro's Node adapter output pulls in a few runtime-only transitive
# packages (e.g. `send`) that aren't reliably resolvable from a fresh
# `npm ci --omit=dev` in a separate stage, so we reuse node_modules as
# already installed and verified working in the build stage instead of
# reinstalling. Simpler and correct beats a smaller-but-broken image.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
