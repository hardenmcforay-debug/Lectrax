import { describe, expect, it } from "vitest";
import {
  attendanceScanSchema,
  forgotPasswordSchema,
  loginSchema,
  signupSchema,
} from "@/lib/validations";
import { buildRotatedQRToken, buildScanUrl } from "@/lib/attendance/qr-rotation";
import { verifyQRToken } from "@/lib/qr-token";
import { normalizePhoneNumber } from "@/lib/auth/phone-number";

describe("integration: login → registration → password reset contracts", () => {
  it("keeps login and signup identifier rules aligned for phone users", () => {
    const phone = "076123456";
    expect(loginSchema.safeParse({ identifier: phone, password: "secret1" }).success).toBe(
      true
    );
    expect(
      signupSchema.safeParse({
        fullName: "Student One",
        identifier: phone,
        password: "password1",
        confirmPassword: "password1",
        role: "student",
        collegeId: "STU-001",
      }).success
    ).toBe(true);
    expect(normalizePhoneNumber(phone)).toBe("+23276123456");
  });

  it("restricts password reset to email identifiers", () => {
    expect(forgotPasswordSchema.safeParse({ identifier: "076123456" }).success).toBe(false);
    expect(
      forgotPasswordSchema.safeParse({ identifier: "student@lectrax.app" }).success
    ).toBe(true);
  });
});

describe("integration: QR attendance flow", () => {
  it("issues a token that students can scan via URL", () => {
    const attendanceSessionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const classSessionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const { token, tokenHash } = buildRotatedQRToken({
      attendanceSessionId,
      classSessionId,
      sessionExpiresAt: new Date(Date.now() + 5 * 60_000),
    });

    const scanUrl = buildScanUrl("http://localhost:3000", token);
    const url = new URL(scanUrl);
    expect(url.pathname).toBe("/student/scan");
    expect(url.searchParams.get("token")).toBe(token);

    const payload = verifyQRToken(token);
    expect(payload?.attendanceSessionId).toBe(attendanceSessionId);

    const deviceId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const scanBody = attendanceScanSchema.safeParse({
      token,
      deviceFingerprint: "fp-device",
      browserFingerprint: "fp-browser",
      deviceIdentifier: deviceId,
    });
    expect(scanBody.success).toBe(true);
    expect(tokenHash).toHaveLength(64);
  });
});
