import { describe, expect, it, vi } from "vitest";
import { establishPasswordRecoverySession } from "@/lib/auth/establish-password-recovery-session";

function mockSupabase(overrides: {
  session?: { access_token: string } | null;
  setSessionError?: Error | null;
  verifyError?: Error | null;
  exchangeError?: Error | null;
}) {
  return {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: overrides.session ?? null },
        error: null,
      })),
      setSession: vi.fn(async () => ({
        data: { session: overrides.setSessionError ? null : { access_token: "ok" } },
        error: overrides.setSessionError ?? null,
      })),
      verifyOtp: vi.fn(async () => ({
        data: { session: overrides.verifyError ? null : { access_token: "ok" } },
        error: overrides.verifyError ?? null,
      })),
      exchangeCodeForSession: vi.fn(async () => ({
        data: { session: overrides.exchangeError ? null : { access_token: "ok" } },
        error: overrides.exchangeError ?? null,
      })),
    },
  };
}

describe("establishPasswordRecoverySession", () => {
  it("applies implicit hash tokens with setSession", async () => {
    vi.stubGlobal("window", {
      location: {
        href: "https://www.lectrax.com/reset-password#access_token=tok&refresh_token=ref&type=recovery",
      },
    });
    const supabase = mockSupabase({ session: null });
    const ok = await establishPasswordRecoverySession(supabase as never);
    expect(ok).toBe(true);
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: "tok",
      refresh_token: "ref",
    });
    vi.unstubAllGlobals();
  });

  it("exchanges a PKCE code when present", async () => {
    vi.stubGlobal("window", {
      location: {
        href: "https://www.lectrax.com/reset-password?code=abc123&type=recovery",
      },
    });
    const supabase = mockSupabase({ session: null });
    const ok = await establishPasswordRecoverySession(supabase as never);
    expect(ok).toBe(true);
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("abc123");
    vi.unstubAllGlobals();
  });
});
