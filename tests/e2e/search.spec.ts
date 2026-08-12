import { test, expect } from '@playwright/test';

test.describe('projects search + tag filtering', () => {
  test('all projects visible by default', async ({ page }) => {
    await page.goto('projects/');
    const cards = page.locator('[data-project]');
    await expect(cards).toHaveCount(4);
    for (const card of await cards.all()) {
      await expect(card).toBeVisible();
    }
  });

  test('text search narrows results and announces the count', async ({ page }) => {
    await page.goto('projects/');
    const input = page.getByLabel('Search projects by keyword');
    const results = page.locator('#projects-results-count');

    await input.fill('handwritten');
    await expect(page.locator('[data-project]:not([hidden])')).toHaveCount(1);
    await expect(page.locator('[data-project][data-id="handwritten-text-recognition"]')).toBeVisible();
    await expect(results).toHaveText(/1 project found/);
  });

  test('search with no matches shows the empty state', async ({ page }) => {
    await page.goto('projects/');
    const input = page.getByLabel('Search projects by keyword');
    await input.fill('zzz-no-such-project-zzz');

    await expect(page.locator('[data-project]:not([hidden])')).toHaveCount(0);
    await expect(page.locator('#projects-results-count')).toHaveText(/0 projects found/);
    await expect(page.locator('text=No projects match your search')).toBeVisible();
  });

  test('tag filter narrows results and toggles pressed state', async ({ page }) => {
    await page.goto('projects/');
    const allBtn = page.locator('.filter-btn[data-filter="all"]');
    const pythonBtn = page.locator('.filter-btn[data-filter="python"]');

    await expect(allBtn).toHaveAttribute('aria-pressed', 'true');
    await pythonBtn.click();

    await expect(pythonBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(allBtn).toHaveAttribute('aria-pressed', 'false');

    const visible = page.locator('[data-project]:not([hidden])');
    const count = await visible.count();
    expect(count).toBeGreaterThan(0);
    for (const card of await visible.all()) {
      const tags = (await card.getAttribute('data-tags')) || '';
      expect(tags.split(',')).toContain('python');
    }
  });

  test('text search and tag filter combine (AND)', async ({ page }) => {
    await page.goto('projects/');
    await page.locator('.filter-btn[data-filter="python"]').click();
    await page.getByLabel('Search projects by keyword').fill('automobile');

    await expect(page.locator('[data-project]:not([hidden])')).toHaveCount(1);
    await expect(
      page.locator('[data-project][data-id="automobile-price-prediction"]')
    ).toBeVisible();
  });

  test('clicking back to "All" restores every project', async ({ page }) => {
    await page.goto('projects/');
    await page.locator('.filter-btn[data-filter="python"]').click();
    await page.locator('.filter-btn[data-filter="all"]').click();

    await expect(page.locator('[data-project]:not([hidden])')).toHaveCount(4);
  });
});

test.describe('blog search + tag filtering', () => {
  test('all posts visible by default', async ({ page }) => {
    await page.goto('blog/');
    const posts = page.locator('[data-post]');
    await expect(posts).toHaveCount(3);
  });

  test('text search narrows results', async ({ page }) => {
    await page.goto('blog/');
    const input = page.getByLabel('Search posts by keyword');
    await input.fill('RAG');

    await expect(page.locator('[data-post]:not([hidden])')).toHaveCount(1);
    await expect(page.locator('#blog-results-count')).toHaveText(/1 post found/);
  });

  test('tag filter narrows results to matching posts only', async ({ page }) => {
    await page.goto('blog/');
    const tagButtons = page.locator('.filter-btn:not([data-filter="all"])');
    const firstTag = await tagButtons.first().getAttribute('data-filter');
    await tagButtons.first().click();

    const visible = page.locator('[data-post]:not([hidden])');
    const count = await visible.count();
    expect(count).toBeGreaterThan(0);
    for (const post of await visible.all()) {
      const tags = (await post.getAttribute('data-tags')) || '';
      expect(tags.split(',')).toContain(firstTag);
    }
  });
});
