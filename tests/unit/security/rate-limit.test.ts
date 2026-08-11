import { afterEach, describe, expect, it } from "vitest";
import {
  __resetRateLimitMemoryForTests,
  buildDeviceRateLimitKey,
  buildRateLimitHeaders,
  buildRateLimitKey,
  buildUserRateLimitKey,
  checkRateLimit,
  isDistributedRateLimitConfigured,
  toUpstashWindow,
} from "@/lib/security/rate-limit";

describe("distributed rate limit (memory fallback)", () => {
  afterEach(() => {
    __resetRateLimitMemoryForTests();
  });

  it("uses sliding window semantics in memory", async () => {
    const key = "test:sliding";
    const rule = { limit: 3, windowMs: 60_000 };

    expect((await checkRateLimit(key, rule)).allowed).toBe(true);
    expect((await checkRateLimit(key, rule)).allowed).toBe(true);
    expect((await checkRateLimit(key, rule)).allowed).toBe(true);

    const denied = await checkRateLimit(key, rule);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSec).toBeGreaterThanOrEqual(1);
    expect(denied.remaining).toBe(0);
  });

  it("enforces burst buckets separately", async () => {
    const key = "test:burst";
    const rule = {
      limit: 100,
      windowMs: 60_000,
      burst: { limit: 2, windowMs: 10_000 },
    };

    expect((await checkRateLimit(key, rule)).allowed).toBe(true);
    expect((await checkRateLimit(key, rule)).allowed).toBe(true);
    const denied = await checkRateLimit(key, rule);
    expect(denied.allowed).toBe(false);
    expect(denied.deniedBy).toBe("burst");
  });

  it("builds scoped keys and response headers", () => {
    expect(buildRateLimitKey("1.2.3.4", "authLoginIp")).toBe("authLoginIp:1.2.3.4");
    expect(buildUserRateLimitKey("u1", "adminMutationPerUser")).toBe(
      "user:u1:adminMutationPerUser"
    );
    expect(buildDeviceRateLimitKey("dev-1", "attendanceScanPerDevice")).toBe(
      "device:dev-1:attendanceScanPerDevice"
    );

    const headers = buildRateLimitHeaders({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAtSec: 1_700_000_000,
      retryAfterSec: 12,
    });
    expect(headers["Retry-After"]).toBe("12");
    expect(headers["X-RateLimit-Limit"]).toBe("10");
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
    expect(headers["X-RateLimit-Reset"]).toBe("1700000000");
  });

  it("converts windows for Upstash", () => {
    expect(toUpstashWindow(60_000)).toBe("1 m");
    expect(toUpstashWindow(15 * 60_000)).toBe("15 m");
    expect(toUpstashWindow(1_000)).toBe("1 s");
  });

  it("reports whether distributed Redis is configured", () => {
    expect(typeof isDistributedRateLimitConfigured()).toBe("boolean");
  });
});
