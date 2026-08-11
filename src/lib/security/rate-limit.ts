import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitBucket = {
  count: number;
  windowStartMs: number;
};

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 10_000;
const RATE_LIMIT_PREFIX = "lectrax:rate-limit";

let redisClient: Redis | null | undefined;
const distributedLimiters = new Map<string, Ratelimit>();

export type RateLimitRule = {
  limit: number;
  windowMs: number;
};

export type RateLimitBackend = "redis" | "memory";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec?: number;
  backend: RateLimitBackend;
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

function checkMemoryRateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStartMs >= rule.windowMs) {
    buckets.set(key, { count: 1, windowStartMs: now });
    pruneBuckets(now);
    return { allowed: true, backend: "memory" };
  }

  if (existing.count >= rule.limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.windowStartMs + rule.windowMs - now) / 1000)
    );
    return { allowed: false, retryAfterSec, backend: "memory" };
  }

  existing.count += 1;
  return { allowed: true, backend: "memory" };
}

function toUpstashWindow(windowMs: number): `${number} s` | `${number} m` | `${number} h` {
  if (windowMs % 3_600_000 === 0) {
    return `${windowMs / 3_600_000} h`;
  }
  if (windowMs % 60_000 === 0) {
    return `${windowMs / 60_000} m`;
  }
  return `${Math.max(1, Math.ceil(windowMs / 1000))} s`;
}

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function getDistributedLimiter(rule: RateLimitRule): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) return null;

  const ruleKey = `${rule.limit}:${rule.windowMs}`;
  const cached = distributedLimiters.get(ruleKey);
  if (cached) return cached;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(rule.limit, toUpstashWindow(rule.windowMs)),
    prefix: RATE_LIMIT_PREFIX,
    analytics: false,
  });

  distributedLimiters.set(ruleKey, limiter);
  return limiter;
}

export function isDistributedRateLimitConfigured(): boolean {
  return getRedisClient() !== null;
}

export async function checkRateLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  const limiter = getDistributedLimiter(rule);

  if (!limiter) {
    return checkMemoryRateLimit(key, rule);
  }

  try {
    const result = await limiter.limit(key);
    if (result.success) {
      return { allowed: true, backend: "redis" };
    }

    const retryAfterSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    return { allowed: false, retryAfterSec, backend: "redis" };
  } catch (error) {
    console.warn("[rate-limit] distributed backend failed, falling back to memory", error);
    return checkMemoryRateLimit(key, rule);
  }
}

export function buildRateLimitKey(ip: string, scope: string): string {
  return `${scope}:${ip}`;
}

/** Log rate-limit violations without sensitive user data (scope + IP only). */
export function logRateLimitViolation(scope: string, ip: string): void {
  console.warn(`[rate-limit] scope=${scope} ip=${ip}`);
}
