import { describe, expect, it } from "vitest";
import {
  getPasswordResetAuthCallbackUrl,
  getPasswordResetCallbackUrl,
  isPasswordRecoveryCallback,
  isPasswordRecoveryLandingPath,
} from "@/lib/auth/password-recovery";

describe("password recovery redirect URLs", () => {
  it("sends reset emails to /reset-password on www", () => {
    expect(getPasswordResetCallbackUrl("https://lectrax.com")).toBe(
      "https://www.lectrax.com/reset-password"
    );
    expect(getPasswordResetCallbackUrl("https://www.lectrax.com/")).toBe(
      "https://www.lectrax.com/reset-password"
    );
  });

  it("keeps a callback fallback for older allowlists", () => {
    const url = new URL(getPasswordResetAuthCallbackUrl("https://www.lectrax.com"));
    expect(url.pathname).toBe("/auth/callback");
    expect(url.searchParams.get("next")).toBe("/reset-password");
    expect(url.searchParams.get("type")).toBe("recovery");
  });

  it("detects recovery callbacks from type or next", () => {
    expect(isPasswordRecoveryCallback({ type: "recovery", next: null })).toBe(true);
    expect(isPasswordRecoveryCallback({ type: null, next: "/reset-password" })).toBe(true);
    expect(isPasswordRecoveryCallback({ type: "signup", next: "/" })).toBe(false);
  });

  it("keeps recovery landings off the PWA /go login rewrite", () => {
    expect(isPasswordRecoveryLandingPath("/reset-password")).toBe(true);
    expect(isPasswordRecoveryLandingPath("/auth/callback")).toBe(true);
    expect(isPasswordRecoveryLandingPath("/go/reset-password")).toBe(true);
    expect(isPasswordRecoveryLandingPath("/login")).toBe(false);
    expect(isPasswordRecoveryLandingPath("/student")).toBe(false);
  });
});

describe("password recovery URL tokens", () => {
  it("reads implicit hash tokens used by recovery emails", async () => {
    const { readPasswordRecoveryParams, hasPasswordRecoveryParams } = await import(
      "@/lib/auth/establish-password-recovery-session"
    );
    const href =
      "https://www.lectrax.com/reset-password#access_token=tok&refresh_token=ref&type=recovery";
    expect(hasPasswordRecoveryParams(href)).toBe(true);
    expect(readPasswordRecoveryParams(href)).toEqual({
      code: null,
      tokenHash: null,
      accessToken: "tok",
      refreshToken: "ref",
      type: "recovery",
    });
  });

  it("reads PKCE code and token_hash from the query string", async () => {
    const { readPasswordRecoveryParams } = await import(
      "@/lib/auth/establish-password-recovery-session"
    );
    expect(
      readPasswordRecoveryParams("https://www.lectrax.com/reset-password?code=abc&type=recovery")
    ).toMatchObject({ code: "abc", type: "recovery" });
    expect(
      readPasswordRecoveryParams(
        "https://www.lectrax.com/reset-password?token_hash=hash&type=recovery"
      )
    ).toMatchObject({ tokenHash: "hash", type: "recovery" });
  });
});
