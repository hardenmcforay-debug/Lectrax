import { describe, expect, it } from "vitest";
import {
  buildRateLimitKey,
  checkRateLimit,
} from "@/lib/security/rate-limit";

describe("in-memory rate limit", () => {
  it("allows requests under the limit and denies after", () => {
    const key = `test:sliding:${Date.now()}`;
    const rule = { limit: 3, windowMs: 60_000 };

    expect(checkRateLimit(key, rule).allowed).toBe(true);
    expect(checkRateLimit(key, rule).allowed).toBe(true);
    expect(checkRateLimit(key, rule).allowed).toBe(true);

    const denied = checkRateLimit(key, rule);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it("resets the window after windowMs elapses", () => {
    const key = `test:window:${Date.now()}`;
    const rule = { limit: 1, windowMs: 1 };

    expect(checkRateLimit(key, rule).allowed).toBe(true);
    expect(checkRateLimit(key, rule).allowed).toBe(false);

    // Busy-wait past the 1ms window so the next call opens a fresh bucket.
    const start = Date.now();
    while (Date.now() - start < 5) {
      // no-op
    }

    expect(checkRateLimit(key, rule).allowed).toBe(true);
  });

  it("builds scoped keys", () => {
    expect(buildRateLimitKey("1.2.3.4", "authLoginIp")).toBe("authLoginIp:1.2.3.4");
  });
});
