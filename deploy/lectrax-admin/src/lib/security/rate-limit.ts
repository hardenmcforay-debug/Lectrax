/**
 * Distributed rate limiting for Lectrax.
 *
 * Production: Upstash Redis sliding windows (shared across all Vercel isolates).
 * Local/CI fallback: in-process sliding window (timestamp ring) when Redis env is absent.
 *
 * Automatic key TTL is handled by Upstash Ratelimit / memory pruning.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitRule = {
  /** Max requests allowed inside the sliding window. */
  limit: number;
  /** Sliding window length in milliseconds. */
  windowMs: number;
  /**
   * Optional short burst bucket (also sliding).
   * Stops credential-stuffing / scan floods without lowering the sustained limit.
   */
  burst?: {
    limit: number;
    windowMs: number;
  };
  /**
   * Behavior when the Redis backend is unavailable.
   * Sensitive surfaces should fail closed.
   */
  failMode?: "open" | "closed";
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix epoch seconds when the current window resets. */
  resetAtSec: number;
  retryAfterSec?: number;
  /** Which bucket denied the request (main | burst). */
  deniedBy?: "main" | "burst" | "backend";
};

const REDIS_PREFIX = "lectrax:rl";

type MemoryBucket = {
  timestamps: number[];
};

const memoryBuckets = new Map<string, MemoryBucket>();
const MAX_MEMORY_BUCKETS = 10_000;

const upstashLimiters = new Map<string, Ratelimit>();

let redisClient: Redis | null | undefined;
let redisUnavailableLogged = false;

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

/** True when Upstash REST credentials are configured. */
export function isDistributedRateLimitConfigured(): boolean {
  return Boolean(readEnv("UPSTASH_REDIS_REST_URL") && readEnv("UPSTASH_REDIS_REST_TOKEN"));
}

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  if (!isDistributedRateLimitConfigured()) {
    redisClient = null;
    return null;
  }

  try {
    redisClient = Redis.fromEnv();
    return redisClient;
  } catch (error) {
    if (!redisUnavailableLogged) {
      redisUnavailableLogged = true;
      console.error("[rate-limit] Failed to initialize Upstash Redis", error);
    }
    redisClient = null;
    return null;
  }
}

/** Convert ms to an Upstash duration string (whole units). */
export function toUpstashWindow(
  windowMs: number
): `${number} ms` | `${number} s` | `${number} m` | `${number} h` | `${number} d` {
  if (windowMs % 86_400_000 === 0) return `${windowMs / 86_400_000} d`;
  if (windowMs % 3_600_000 === 0) return `${windowMs / 3_600_000} h`;
  if (windowMs % 60_000 === 0) return `${windowMs / 60_000} m`;
  if (windowMs % 1_000 === 0) return `${windowMs / 1_000} s`;
  return `${windowMs} ms`;
}

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cacheKey = `${limit}:${windowMs}`;
  const existing = upstashLimiters.get(cacheKey);
  if (existing) return existing;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, toUpstashWindow(windowMs)),
    prefix: REDIS_PREFIX,
    analytics: true,
    /**
     * Edge/serverless ephemeral cache reduces Redis round-trips for hot keys
     * without weakening distributed correctness of the primary counter.
     */
    ephemeralCache: new Map(),
  });

  upstashLimiters.set(cacheKey, limiter);
  return limiter;
}

function pruneMemoryBuckets(now: number): void {
  if (memoryBuckets.size <= MAX_MEMORY_BUCKETS) return;

  for (const [key, bucket] of memoryBuckets) {
    const newest = bucket.timestamps[bucket.timestamps.length - 1] ?? 0;
    if (now - newest > 3_600_000 || bucket.timestamps.length === 0) {
      memoryBuckets.delete(key);
    }
    if (memoryBuckets.size <= MAX_MEMORY_BUCKETS * 0.8) break;
  }
}

/** True sliding window in memory (dev/CI fallback only). */
function checkMemorySlidingWindow(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = memoryBuckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);

  const resetAtSec = Math.ceil(
    ((bucket.timestamps[0] ?? now) + windowMs) / 1000
  );

  if (bucket.timestamps.length >= limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil(((bucket.timestamps[0] ?? now) + windowMs - now) / 1000)
    );
    memoryBuckets.set(key, bucket);
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAtSec,
      retryAfterSec,
      deniedBy: "main",
    };
  }

  bucket.timestamps.push(now);
  memoryBuckets.set(key, bucket);
  pruneMemoryBuckets(now);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - bucket.timestamps.length),
    resetAtSec,
  };
}

async function checkSingleWindow(
  key: string,
  limit: number,
  windowMs: number,
  failMode: "open" | "closed"
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(limit, windowMs);

  if (!limiter) {
    return checkMemorySlidingWindow(key, limit, windowMs);
  }

  try {
    const result = await limiter.limit(key);
    const resetAtSec = Math.ceil(result.reset / 1000);
    if (!result.success) {
      return {
        allowed: false,
        limit: result.limit,
        remaining: Math.max(0, result.remaining),
        resetAtSec,
        retryAfterSec: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
        deniedBy: "main",
      };
    }

    return {
      allowed: true,
      limit: result.limit,
      remaining: Math.max(0, result.remaining),
      resetAtSec,
    };
  } catch (error) {
    if (!redisUnavailableLogged) {
      redisUnavailableLogged = true;
      console.error("[rate-limit] Upstash limit() failed", error);
    }

    if (failMode === "closed") {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAtSec: Math.ceil(Date.now() / 1000) + 30,
        retryAfterSec: 30,
        deniedBy: "backend",
      };
    }

    // Fail open for non-sensitive traffic so Redis blips do not take the app down.
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAtSec: Math.ceil((Date.now() + windowMs) / 1000),
    };
  }
}

/**
 * Enforce a sliding-window (and optional burst) limit for `key`.
 * Keys should already be scoped (ip / user / device / identifier).
 */
export async function checkRateLimit(
  key: string,
  rule: RateLimitRule
): Promise<RateLimitResult> {
  const failMode = rule.failMode ?? "open";

  if (rule.burst) {
    const burst = await checkSingleWindow(
      `${key}:burst`,
      rule.burst.limit,
      rule.burst.windowMs,
      failMode
    );
    if (!burst.allowed) {
      return { ...burst, deniedBy: "burst" };
    }
  }

  return checkSingleWindow(key, rule.limit, rule.windowMs, failMode);
}

export function buildRateLimitKey(ip: string, scope: string): string {
  return `${scope}:${ip}`;
}

export function buildUserRateLimitKey(userId: string, scope: string): string {
  return `user:${userId}:${scope}`;
}

export function buildDeviceRateLimitKey(deviceId: string, scope: string): string {
  return `device:${deviceId}:${scope}`;
}

/** Log rate-limit violations without sensitive user data. */
export function logRateLimitViolation(scope: string, subject: string): void {
  console.warn(`[rate-limit] scope=${scope} subject=${subject}`);
}

/** Standard rate-limit response headers (RFC-style + Retry-After). */
export function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(result.resetAtSec),
  };

  if (!result.allowed && result.retryAfterSec) {
    headers["Retry-After"] = String(result.retryAfterSec);
  }

  return headers;
}

/** Test helper — clears in-memory fallback state. */
export function __resetRateLimitMemoryForTests(): void {
  memoryBuckets.clear();
  upstashLimiters.clear();
  redisClient = undefined;
  redisUnavailableLogged = false;
}
