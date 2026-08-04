import type { APIRoute } from 'astro';
import { contactSchema, toFieldErrors } from '../../lib/contact.schema';
import { sendContactEmail, getMailProvider } from '../../lib/mailer';
import { checkRateLimit } from '../../lib/rateLimit';

/**
 * This route only exists when the site is built with `output: 'server'`
 * (ADAPTER=node — see astro.config.mjs and docs/DEPLOYMENT.md). In the
 * default `output: 'static'` build used for GitHub Pages, Astro never
 * emits on-demand routes at all, so this file is simply absent from
 * `dist/` and the contact page's client script falls back to a mailto
 * link instead of POSTing here.
 */
export const prerender = false;

const RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 }; // 5 requests / 10 minutes / IP

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (getMailProvider() === 'none') {
    return jsonResponse(
      {
        ok: false,
        errors: {
          form: 'The contact API is not configured on this deployment. Please use the mailto link below instead.',
        },
      },
      503
    );
  }

  let clientIp = 'unknown';
  try {
    clientIp = clientAddress ?? 'unknown';
  } catch {
    // clientAddress throws in some adapters/dev modes when unavailable — best effort only.
  }

  const rateLimit = checkRateLimit(clientIp, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return jsonResponse(
      {
        ok: false,
        errors: { form: 'Too many requests. Please try again in a few minutes.' },
      },
      429
    );
  }

  let payload: unknown;
  const contentType = request.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const form = await request.formData();
      payload = Object.fromEntries(form.entries());
    }
  } catch {
    return jsonResponse({ ok: false, errors: { form: 'Could not read request body.' } }, 400);
  }

  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonResponse({ ok: false, errors: toFieldErrors(parsed.error) }, 400);
  }

  // Honeypot: silently pretend success so bots don't learn to avoid the field.
  if (parsed.data.company) {
    return jsonResponse({ ok: true }, 200);
  }

  try {
    await sendContactEmail(parsed.data);
  } catch (error) {
    console.error('[api/contact] send failed:', error);
    return jsonResponse(
      { ok: false, errors: { form: 'Could not send your message. Please try again later.' } },
      502
    );
  }

  return jsonResponse({ ok: true }, 200);
};
