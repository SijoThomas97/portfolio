import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests run against the production build served by `astro preview`,
 * so the `/portfolio` base path matches GitHub Pages exactly.
 * Run `npm run build` first (the webServer command does it for you).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4321/portfolio/',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321/portfolio/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
