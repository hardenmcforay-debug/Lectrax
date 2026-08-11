import { beforeEach, describe, expect, it, vi } from "vitest";

const authAccountExistsForIdentifier = vi.fn();
const rejectIfKeyRateLimited = vi.fn();
const waitForMinimumResponseTime = vi.fn(async () => undefined);
const auditInsert = vi.fn(async () => ({ error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(async () => ({
    from: () => ({ insert: auditInsert }),
  })),
}));

vi.mock("@/lib/auth/password-reset", () => ({
  authAccountExistsForIdentifier: (...args: unknown[]) =>
    (authAccountExistsForIdentifier as (...a: unknown[]) => unknown)(...args),
  buildPasswordResetRateLimitKey: (identifier: string) => `rl:${identifier}`,
  PASSWORD_RESET_SUCCESS_MESSAGE:
    "If an account exists with that email address, a password reset link has been sent.",
  waitForMinimumResponseTime: (...args: unknown[]) =>
    (waitForMinimumResponseTime as (...a: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/security/enforce-rate-limit", () => ({
  rejectIfKeyRateLimited: (...args: unknown[]) =>
    (rejectIfKeyRateLimited as (...a: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/errors/logger", () => ({
  logServerError: vi.fn(),
}));

describe("API: POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rejectIfKeyRateLimited.mockResolvedValue(null);
    authAccountExistsForIdentifier.mockResolvedValue({
      exists: true,
      email: "user@lectrax.app",
      recoverable: true,
    });
    waitForMinimumResponseTime.mockResolvedValue(undefined);
    auditInsert.mockResolvedValue({ error: null });
  });

  it("rejects invalid emails", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier: "not-an-email" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(response.status).toBe(400);
  });

  it("returns enumeration-safe success for valid emails", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier: "user@lectrax.app" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(String(json.message).toLowerCase()).toContain("if an account exists");
    expect(waitForMinimumResponseTime).toHaveBeenCalled();
  });
});
