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
