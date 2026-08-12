import { test, expect } from '@playwright/test';

test.describe('projects', () => {
  test('listing page renders project cards', async ({ page }) => {
    await page.goto('projects/');
    await expect(page.locator('h1')).toBeVisible();
    const cards = page.locator('main a[href*="/portfolio/projects/"]');
    expect(await cards.count()).toBeGreaterThanOrEqual(4);
  });

  test('a project detail page renders from the listing', async ({ page }) => {
    await page.goto('projects/');
    const first = page.locator('main a[href*="/portfolio/projects/"]').first();
    await first.click();
    await expect(page).toHaveURL(/\/portfolio\/projects\/[^/]+\/?$/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('blog', () => {
  test('listing page renders posts', async ({ page }) => {
    await page.goto('blog/');
    await expect(page.locator('h1')).toBeVisible();
    const posts = page.locator('main a[href*="/portfolio/blog/"]');
    expect(await posts.count()).toBeGreaterThanOrEqual(3);
  });

  test('a blog post page renders from the listing', async ({ page }) => {
    await page.goto('blog/');
    const first = page.locator('main a[href*="/portfolio/blog/"]').first();
    await first.click();
    await expect(page).toHaveURL(/\/portfolio\/blog\/[^/]+\/?$/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('rss feed is served', async ({ request }) => {
    const res = await request.get('http://localhost:4321/portfolio/rss.xml');
    expect(res.ok()).toBe(true);
    expect(await res.text()).toContain('<rss');
  });
});
