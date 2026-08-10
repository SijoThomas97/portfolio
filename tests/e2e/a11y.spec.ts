import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages: Array<{ name: string; path: string }> = [
  { name: 'home', path: './' },
  { name: 'projects listing', path: 'projects/' },
  { name: 'blog listing', path: 'blog/' },
  { name: 'contact', path: 'contact/' },
];

for (const { name, path } of pages) {
  test(`${name} page has no serious or critical axe violations`, async ({ page }) => {
    // The site wraps entry animations in prefers-reduced-motion; disable them
    // so axe scans the settled page instead of a mid-fade frame.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const seriousOrWorse = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? '')
    );
    expect(
      seriousOrWorse,
      JSON.stringify(
        seriousOrWorse.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => n.target),
        })),
        null,
        2
      )
    ).toEqual([]);
  });
}

test('skip link is the first focusable element on the home page', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveAttribute('href', /#/);
  await expect(focused).toContainText(/skip/i);
});
