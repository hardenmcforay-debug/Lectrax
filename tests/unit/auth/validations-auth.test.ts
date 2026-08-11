import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  passwordChangeSchema,
  signupSchema,
} from "@/lib/validations";

describe("auth validation schemas", () => {
  it("accepts valid login payloads", () => {
    const result = loginSchema.safeParse({
      identifier: "lecturer@lectrax.app",
      password: "secret1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid login identifiers", () => {
    const result = loginSchema.safeParse({
      identifier: "bad",
      password: "secret1",
    });
    expect(result.success).toBe(false);
  });

  it("requires matching signup passwords and a role", () => {
    const mismatch = signupSchema.safeParse({
      fullName: "Ada Lovelace",
      identifier: "076123456",
      password: "password1",
      confirmPassword: "password2",
      role: "student",
    });
    expect(mismatch.success).toBe(false);

    const ok = signupSchema.safeParse({
      fullName: "Ada Lovelace",
      identifier: "ada@lectrax.app",
      password: "password1",
      confirmPassword: "password1",
      role: "lecturer",
    });
    expect(ok.success).toBe(true);
  });

  it("requires an email for forgot-password", () => {
    expect(
      forgotPasswordSchema.safeParse({ identifier: "076123456" }).success
    ).toBe(false);
    expect(
      forgotPasswordSchema.safeParse({ identifier: "user@lectrax.app" }).success
    ).toBe(true);
  });

  it("requires matching password changes", () => {
    expect(
      passwordChangeSchema.safeParse({
        password: "newpass12",
        confirmPassword: "newpass12",
      }).success
    ).toBe(true);
    expect(
      passwordChangeSchema.safeParse({
        password: "newpass12",
        confirmPassword: "otherpass",
      }).success
    ).toBe(false);
  });
});
