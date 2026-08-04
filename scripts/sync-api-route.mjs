#!/usr/bin/env node
/**
 * Copies (or removes) the /api/contact server route into src/pages/api/
 * before the Astro build runs, based on whether ADAPTER=node is set.
 *
 * Why: Astro's `output: 'static'` mode fails the build outright if ANY
 * page under src/pages sets `export const prerender = false` without an
 * adapter installed (NoAdapterInstalled error) — it's not enough for the
 * route to just be unreachable, the file must not exist under
 * src/pages/api at all for the default GitHub Pages (static) build.
 *
 * `npm run build`            -> static build, api route file removed/absent
 * `ADAPTER=node npm run build` -> hybrid build, api route file copied in
 *
 * See docs/DEPLOYMENT.md for the full explanation of both build targets.
 */
import { existsSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(rootDir, 'src', 'api-routes', 'contact', 'route.ts');
const destDir = join(rootDir, 'src', 'pages', 'api');
const dest = join(destDir, 'contact.ts');

const useNodeAdapter = process.env.ADAPTER === 'node';

if (useNodeAdapter) {
  mkdirSync(destDir, { recursive: true });
  copyFileSync(source, dest);
  console.log('[sync-api-route] ADAPTER=node — copied src/api-routes/contact/route.ts -> src/pages/api/contact.ts');
} else {
  if (existsSync(dest)) {
    rmSync(dest);
    console.log('[sync-api-route] static build — removed src/pages/api/contact.ts');
  }
  // Clean up the directory if it's now empty so `dist/` never sees a stray dir.
  if (existsSync(destDir)) {
    try {
      rmSync(destDir, { recursive: false });
    } catch {
      // Directory not empty (unexpected extra files) — leave it alone.
    }
  }
  console.log('[sync-api-route] static build — no server API route included');
}
