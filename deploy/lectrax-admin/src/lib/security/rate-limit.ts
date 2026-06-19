/**
 * In-memory sliding-window rate limiter for API abuse protection.
 *
 * On serverless (Vercel), each isolate maintains its own store — this still slows
 * abuse and complements edge/WAF limits. For distributed enforcement, add
 * Upstash Redis or Vercel Firewall (see DDoS_SECURITY_REPORT.md).
 */

type RateLimitBucket = {
  count: number;
  windowStartMs: number;
};

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 10_000;

export type RateLimitRule = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec?: number;
};

function pruneBuckets(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;

  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStartMs > 3_600_000) {
      buckets.delete(key);
    }
    if (buckets.size <= MAX_BUCKETS * 0.8) break;
  }
}

export function checkRateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStartMs >= rule.windowMs) {
    buckets.set(key, { count: 1, windowStartMs: now });
    pruneBuckets(now);
    return { allowed: true };
  }

  if (existing.count >= rule.limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.windowStartMs + rule.windowMs - now) / 1000)
    );
    return { allowed: false, retryAfterSec };
  }

  existing.count += 1;
  return { allowed: true };
}

export function buildRateLimitKey(ip: string, scope: string): string {
  return `${scope}:${ip}`;
}
