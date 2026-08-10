import { test, expect } from '@playwright/test';

/**
 * Contact form validation states.
 *
 * These tests run against the static preview build (see
 * playwright.config.ts — `npm run build && npm run preview`, no
 * ADAPTER=node), so there is no /api/contact route in this deployment.
 * That means:
 *   - Client-side validation errors (empty/too-short/invalid fields)
 *     must appear WITHOUT any network call — see the
 *     `validateClientSide()` pre-check in src/pages/contact.astro.
 *   - A fully valid submission passes that pre-check, then the fetch to
 *     /api/contact 404s (route doesn't exist in a static build) and the
 *     form falls back to a mailto: link, which we assert on the
 *     `data-mailto-href` value + status message rather than following
 *     the OS-level mailto navigation.
 */

test.describe('contact form validation', () => {
  test('submitting an empty form shows all three field errors', async ({ page }) => {
    await page.goto('contact/');
    await page.locator('#contact-submit').click();

    await expect(page.locator('#name-error')).toBeVisible();
    await expect(page.locator('#name-error')).toHaveText(/at least 2 characters/);
    await expect(page.locator('#email-error')).toBeVisible();
    await expect(page.locator('#email-error')).toHaveText(/valid email/);
    await expect(page.locator('#message-error')).toBeVisible();
    await expect(page.locator('#message-error')).toHaveText(/at least 10 characters/);

    await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#message')).toHaveAttribute('aria-invalid', 'true');

    await expect(page.locator('#contact-status')).toBeVisible();
    await expect(page.locator('#contact-status')).toHaveText(/fix the highlighted fields/);
  });

  test('invalid email shows only the email error', async ({ page }) => {
    await page.goto('contact/');
    await page.locator('#name').fill('Ada Lovelace');
    await page.locator('#email').fill('not-an-email');
    await page.locator('#message').fill('This message is definitely long enough.');
    await page.locator('#contact-submit').click();

    await expect(page.locator('#email-error')).toBeVisible();
    await expect(page.locator('#email-error')).toHaveText(/valid email/);
    await expect(page.locator('#name-error')).toBeHidden();
    await expect(page.locator('#message-error')).toBeHidden();
  });

  test('message under the minimum length is rejected', async ({ page }) => {
    await page.goto('contact/');
    await page.locator('#name').fill('Ada Lovelace');
    await page.locator('#email').fill('ada@example.com');
    await page.locator('#message').fill('too short');
    await page.locator('#contact-submit').click();

    await expect(page.locator('#message-error')).toBeVisible();
    await expect(page.locator('#message-error')).toHaveText(/at least 10 characters/);
  });

  test('fixing the fields clears the previous errors on resubmit', async ({ page }) => {
    await page.goto('contact/');
    await page.locator('#contact-submit').click();
    await expect(page.locator('#name-error')).toBeVisible();

    await page.locator('#name').fill('Ada Lovelace');
    await page.locator('#email').fill('ada@example.com');
    await page.locator('#message').fill('This message is definitely long enough.');

    // Prevent the mailto: navigation the fallback path would trigger so
    // the test stays in the page context.
    await page.route('**/api/contact', (route) => route.abort());
    await page.locator('#contact-submit').click();

    await expect(page.locator('#name-error')).toBeHidden();
    await expect(page.locator('#email-error')).toBeHidden();
    await expect(page.locator('#message-error')).toBeHidden();
  });

  test('a fully valid submission on the static build falls back to mailto', async ({ page }) => {
    await page.goto('contact/');
    const form = page.locator('#contact-form');
    const mailtoHref = await form.getAttribute('data-mailto-href');
    expect(mailtoHref).toMatch(/^mailto:/);

    await page.locator('#name').fill('Ada Lovelace');
    await page.locator('#email').fill('ada@example.com');
    await page.locator('#message').fill('This message is definitely long enough.');

    // Intercept the client's attempt to navigate to mailto: so Playwright
    // doesn't try to hand off to an OS mail client.
    let navigatedTo: string | null = null;
    await page.exposeFunction('__capturedMailto', (href: string) => {
      navigatedTo = href;
    });
    await page.addInitScript(() => {
      const originalHrefDescriptor = Object.getOwnPropertyDescriptor(
        window.location,
        'href'
      );
      try {
        Object.defineProperty(window.location, 'href', {
          set(value: string) {
            // @ts-expect-error - exposed by the test
            window.__capturedMailto(value);
          },
          get() {
            return originalHrefDescriptor?.get?.call(window.location) ?? '';
          },
        });
      } catch {
        // Some browsers disallow redefining location.href — the mailto
        // navigation will still happen but won't crash the test.
      }
    });
    await page.reload();

    await page.locator('#name').fill('Ada Lovelace');
    await page.locator('#email').fill('ada@example.com');
    await page.locator('#message').fill('This message is definitely long enough.');
    await page.locator('#contact-submit').click();

    await expect(page.locator('#contact-status')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#contact-status')).toHaveText(
      /static site without a contact API|Could not reach the contact API/
    );
  });

  test('mailto fallback link is visible below the form', async ({ page }) => {
    await page.goto('contact/');
    const link = page.locator('#contact-form').locator('..').locator('a[href^="mailto:"]').first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /mailto:sijo\.thomas0097@gmail\.com/);
  });

  test('honeypot field is present but hidden from sighted users and assistive tech', async ({
    page,
  }) => {
    await page.goto('contact/');
    const honeypot = page.locator('#contact-form #company');
    await expect(honeypot).toBeAttached();
    await expect(honeypot).toHaveAttribute('tabindex', '-1');

    // Visually hidden via the sr-only utility class on its wrapper (an
    // "off-screen clip" pattern, not display:none) — real users never
    // see it, but it still has box dimensions, so we assert on the
    // wrapper's sr-only + aria-hidden rather than Playwright's
    // geometry-based toBeVisible().
    const wrapper = page.locator('#contact-form div.sr-only[aria-hidden="true"]');
    await expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    await expect(wrapper.locator('#company')).toHaveCount(1);

    const clipPath = await honeypot.evaluate(
      (el) => getComputedStyle(el.parentElement!).clipPath
    );
    expect(clipPath).toBe('inset(50%)');
  });
});
