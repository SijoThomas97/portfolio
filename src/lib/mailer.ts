/**
 * Provider-agnostic mail sending for the contact form.
 *
 * Supports two mutually-exclusive providers, chosen entirely by which
 * env vars are present at runtime (see docs/DEPLOYMENT.md for the full
 * list and setup steps for each host):
 *
 *   1. Resend        — RESEND_API_KEY + CONTACT_TO_EMAIL (+ optional CONTACT_FROM_EMAIL)
 *   2. SMTP           — SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS + CONTACT_TO_EMAIL
 *
 * If neither is configured, `getMailProvider()` returns 'none' and the
 * API route (and the static build) fall back to a plain `mailto:` link
 * instead of a working POST endpoint.
 */

export type MailProvider = 'resend' | 'smtp' | 'none';

export interface ContactMailInput {
  name: string;
  email: string;
  message: string;
}

export function getMailProvider(env: NodeJS.ProcessEnv = process.env): MailProvider {
  if (env.RESEND_API_KEY && env.CONTACT_TO_EMAIL) return 'resend';
  if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.CONTACT_TO_EMAIL) {
    return 'smtp';
  }
  return 'none';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailBody({ name, email, message }: ContactMailInput) {
  const text = `New contact form submission\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
  const html = `<p><strong>New contact form submission</strong></p>
<p><strong>Name:</strong> ${escapeHtml(name)}<br/>
<strong>Email:</strong> ${escapeHtml(email)}</p>
<p><strong>Message:</strong></p>
<p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`;
  return { text, html };
}

async function sendViaResend(
  input: ContactMailInput,
  env: NodeJS.ProcessEnv
): Promise<void> {
  const { text, html } = buildEmailBody(input);
  const fromEmail = env.CONTACT_FROM_EMAIL ?? 'onboarding@resend.dev';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Portfolio Contact Form <${fromEmail}>`,
      to: [env.CONTACT_TO_EMAIL],
      reply_to: input.email,
      subject: `New message from ${input.name} (portfolio contact form)`,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }
}

async function sendViaSmtp(input: ContactMailInput, env: NodeJS.ProcessEnv): Promise<void> {
  // Lazy import so `nodemailer` is only pulled into the server bundle
  // when SMTP is actually the active provider.
  const nodemailer = await import('nodemailer');
  const { text, html } = buildEmailBody(input);

  const transport = nodemailer.default.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: env.SMTP_SECURE === 'true' || Number(env.SMTP_PORT) === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transport.sendMail({
    from: env.CONTACT_FROM_EMAIL ?? env.SMTP_USER,
    to: env.CONTACT_TO_EMAIL,
    replyTo: input.email,
    subject: `New message from ${input.name} (portfolio contact form)`,
    text,
    html,
  });
}

/** Sends the contact email via whichever provider is configured. Throws if none is. */
export async function sendContactEmail(
  input: ContactMailInput,
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const provider = getMailProvider(env);
  if (provider === 'resend') return sendViaResend(input, env);
  if (provider === 'smtp') return sendViaSmtp(input, env);
  throw new Error('No mail provider configured (set RESEND_API_KEY or SMTP_* env vars).');
}
