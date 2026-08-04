/**
 * Minimal in-memory, fixed-window rate limiter.
 *
 * Deliberately simple: this runs inside a single serverless/Node process,
 * so it resets whenever that process cold-starts and does NOT share state
 * across multiple instances (e.g. several concurrent Vercel/Netlify
 * function invocations). That's an acceptable trade-off for a personal
 * contact form — it stops naive scripted spam/retries without needing an
 * external store (Redis/Upstash/KV). If real abuse shows up, swap this
 * module for a durable store keyed the same way (see docs/DEPLOYMENT.md).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Max requests allowed per window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/** Test-only helper to reset module state between test cases. */
export function _resetRateLimitStore(): void {
  buckets.clear();
}
