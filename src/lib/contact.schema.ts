import { z } from 'astro/zod';

/**
 * Contact form payload schema — shared between the client-side island
 * (for inline validation messages) and the /api/contact server route
 * (for authoritative validation). Kept in a plain module (no Astro
 * virtual imports) so it is importable from unit tests.
 */
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(100, 'Name must be 100 characters or fewer.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters.')
    .max(5000, 'Message must be 5000 characters or fewer.'),
  // Honeypot field — real users never see or fill this (hidden via CSS +
  // aria-hidden + tabindex=-1). Bots that blindly fill every input trip it.
  // Deliberately NOT rejected here: the route checks this after a
  // successful parse and silently no-ops instead of sending, so bots get
  // an indistinguishable 200 response and don't learn to avoid the field.
  company: z.string().optional().default(''),
});

export type ContactPayload = z.infer<typeof contactSchema>;

export interface ContactFieldErrors {
  name?: string;
  email?: string;
  message?: string;
  company?: string;
  form?: string;
}

/** Flattens a ZodError into the field-keyed shape the UI renders. */
export function toFieldErrors(error: z.ZodError): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (key === 'name' || key === 'email' || key === 'message' || key === 'company') {
      errors[key] = issue.message;
    }
  }
  return errors;
}
