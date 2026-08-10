import { test, expect } from '@playwright/test';

test.describe('theme toggle', () => {
  test('toggles the dark class and persists the choice', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('./');

    const html = page.locator('html');
    const toggle = page.locator('header [data-theme-toggle]');
    await expect(toggle).toBeVisible();

    const wasDark = await html.evaluate((el) => el.classList.contains('dark'));

    await toggle.click();
    await expect(html).toHaveClass(wasDark ? /^(?!.*dark).*$/ : /dark/);
    const nowDark = await html.evaluate((el) => el.classList.contains('dark'));
    expect(nowDark).toBe(!wasDark);

    // Choice is stored and survives a reload
    const stored = await page.evaluate(() => localStorage.getItem('theme'));
    expect(stored).toBe(nowDark ? 'dark' : 'light');

    await page.reload();
    const afterReload = await html.evaluate((el) => el.classList.contains('dark'));
    expect(afterReload).toBe(nowDark);
  });

  test('updates its accessible label to describe the action', async ({ page }) => {
    await page.goto('./');
    const toggle = page.locator('header [data-theme-toggle]');
    const label = await toggle.getAttribute('aria-label');
    expect(label).toMatch(/Switch to (light|dark) mode/);

    await toggle.click();
    const newLabel = await toggle.getAttribute('aria-label');
    expect(newLabel).toMatch(/Switch to (light|dark) mode/);
    expect(newLabel).not.toBe(label);
  });
});
