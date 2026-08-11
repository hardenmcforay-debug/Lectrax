import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildRateLimitKey,
  checkRateLimit,
} from "@/lib/security/rate-limit";

describe("in-memory rate limit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit and denies after", async () => {
    const key = `test:sliding:${Date.now()}`;
    const rule = { limit: 3, windowMs: 60_000 };

    expect((await checkRateLimit(key, rule)).allowed).toBe(true);
    expect((await checkRateLimit(key, rule)).allowed).toBe(true);
    expect((await checkRateLimit(key, rule)).allowed).toBe(true);

    const denied = await checkRateLimit(key, rule);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSec).toBeGreaterThanOrEqual(1);
    expect(denied.backend).toBe("memory");
  });

  it("resets the window after windowMs elapses", async () => {
    vi.useFakeTimers();
    const key = `test:window:${Date.now()}`;
    const rule = { limit: 1, windowMs: 1_000 };

    expect((await checkRateLimit(key, rule)).allowed).toBe(true);
    expect((await checkRateLimit(key, rule)).allowed).toBe(false);

    vi.advanceTimersByTime(1_001);

    expect((await checkRateLimit(key, rule)).allowed).toBe(true);
  });

  it("builds scoped keys", () => {
    expect(buildRateLimitKey("1.2.3.4", "authLoginIp")).toBe("authLoginIp:1.2.3.4");
  });
});
