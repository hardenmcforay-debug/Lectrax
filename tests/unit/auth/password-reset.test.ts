import { describe, expect, it, vi } from "vitest";
import {
  buildPasswordResetRateLimitKey,
  normalizeAuthEmail,
  PASSWORD_RESET_MIN_RESPONSE_MS,
  waitForMinimumResponseTime,
} from "@/lib/auth/password-reset";
import { PASSWORD_RESET_SUCCESS_MESSAGE } from "@/lib/auth/password-reset-constants";

describe("password-reset helpers", () => {
  it("normalizes auth emails", () => {
    expect(normalizeAuthEmail("  User@Lectrax.APP ")).toBe("user@lectrax.app");
  });

  it("builds stable hashed rate-limit keys", () => {
    const a = buildPasswordResetRateLimitKey("user@lectrax.app");
    const b = buildPasswordResetRateLimitKey("USER@lectrax.app");
    expect(a).toBe(b);
    expect(a).toMatch(/^identifier:[a-f0-9]{24}:passwordReset$/);
  });

  it("exposes enumeration-safe success copy", () => {
    expect(PASSWORD_RESET_SUCCESS_MESSAGE.toLowerCase()).toContain("if an account exists");
  });

  it("waits until the minimum response window elapses", async () => {
    vi.useFakeTimers();
    const startedAt = Date.now();
    const pending = waitForMinimumResponseTime(startedAt, PASSWORD_RESET_MIN_RESPONSE_MS);
    await vi.advanceTimersByTimeAsync(PASSWORD_RESET_MIN_RESPONSE_MS);
    await expect(pending).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
