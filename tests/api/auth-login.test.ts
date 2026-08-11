import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const resolveLoginEmailForSignInAsync = vi.fn();
const rejectIfKeyRateLimited = vi.fn();
const preparePhoneAccountForLogin = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { signInWithPassword },
  })),
}));

vi.mock("@/lib/auth/recovery-email", () => ({
  resolveLoginEmailForSignInAsync: (...args: unknown[]) =>
    resolveLoginEmailForSignInAsync(...args),
}));

vi.mock("@/lib/auth/login-email", () => ({
  preparePhoneAccountForLogin: (...args: unknown[]) => preparePhoneAccountForLogin(...args),
}));

vi.mock("@/lib/security/enforce-rate-limit", () => ({
  rejectIfKeyRateLimited: (...args: unknown[]) => rejectIfKeyRateLimited(...args),
}));

vi.mock("@/lib/env", () => ({
  isServiceRoleConfigured: () => false,
}));

vi.mock("@/lib/errors/logger", () => ({
  logServerError: vi.fn(),
}));

describe("API: POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rejectIfKeyRateLimited.mockResolvedValue(null);
    resolveLoginEmailForSignInAsync.mockResolvedValue("lecturer@lectrax.app");
    signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1" }, session: {} },
      error: null,
    });
  });

  it("returns 400 for invalid JSON body", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: "{",
        headers: { "content-type": "application/json" },
      })
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for schema validation failures", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: "bad", password: "1" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeTruthy();
  });

  it("returns 401 when credentials are rejected", async () => {
    signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: "lecturer@lectrax.app",
          password: "wrongpass",
        }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(response.status).toBe(401);
  });

  it("returns ok on successful login", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: "lecturer@lectrax.app",
          password: "secret12",
        }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
