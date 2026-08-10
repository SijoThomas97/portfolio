import { test, expect } from '@playwright/test';

test.describe('primary navigation', () => {
  test('home page renders with a single h1', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle(/Sijo Thomas/i);
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('header links navigate to projects, blog and contact', async ({ page }) => {
    await page.goto('./');
    const nav = page.getByRole('navigation', { name: 'Primary' });

    await nav.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL(/\/portfolio\/projects\/?$/);
    await expect(page.locator('h1')).toBeVisible();

    await nav.getByRole('link', { name: 'Blog' }).click();
    await expect(page).toHaveURL(/\/portfolio\/blog\/?$/);
    await expect(page.locator('h1')).toBeVisible();

    await nav.getByRole('link', { name: 'Contact' }).click();
    await expect(page).toHaveURL(/\/portfolio\/contact\/?$/);
    await expect(page.locator('h1')).toBeVisible();

    await nav.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/\/portfolio\/?$/);
  });

  test('active nav link is marked with aria-current', async ({ page }) => {
    await page.goto('projects/');
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  test('all internal header/footer links carry the /portfolio base', async ({ page }) => {
    await page.goto('./');
    const hrefs = await page
      .locator('header a[href^="/"], footer a[href^="/"]')
      .evaluateAll((els) => els.map((a) => a.getAttribute('href')));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href, `link ${href} must start with /portfolio`).toMatch(/^\/portfolio(\/|$)/);
    }
  });

  test('404 page renders for unknown routes', async ({ page }) => {
    const response = await page.goto('does-not-exist/');
    expect(response?.status()).toBe(404);
  });
});
