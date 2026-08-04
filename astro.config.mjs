// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

/**
 * Build target switch — see docs/DEPLOYMENT.md for the full explanation.
 *
 * GitHub Pages can only serve static files, so the default build
 * (`npm run build`, no env vars) stays `output: 'static'` with no adapter.
 * The `src/pages/api/contact.ts` endpoint sets `prerender = false`, but
 * Astro's static output mode ignores that and simply does not emit the
 * route at all — so the GitHub Pages build has no server code and the
 * contact page falls back to a documented `mailto:` link (see
 * ContactForm's no-JS/no-API fallback).
 *
 * To deploy somewhere that CAN run server code (Vercel, Netlify, a Node
 * host, a Docker container, etc.), set ADAPTER=node and the site builds
 * in 'hybrid' mode: every page is still prerendered to static HTML
 * EXCEPT the opted-out /api/contact route, which runs on demand so it
 * can read env vars and send real email at request time.
 */
const useNodeAdapter = process.env.ADAPTER === 'node';

// https://astro.build/config
export default defineConfig({
  site: 'https://sijothomas97.github.io',
  base: '/portfolio',
  output: useNodeAdapter ? 'server' : 'static',
  adapter: useNodeAdapter ? node({ mode: 'standalone' }) : undefined,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
