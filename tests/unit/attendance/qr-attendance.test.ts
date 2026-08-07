import { describe, expect, it } from "vitest";
import {
  ATTENDANCE_RECORDED_MESSAGE,
  EXPIRED_QR_MESSAGE,
  isAttendanceSessionOpen,
  QR_TOKEN_TTL_SECONDS,
} from "@/lib/attendance/constants";
import { buildRotatedQRToken, buildScanUrl } from "@/lib/attendance/qr-rotation";
import { createQRToken, hashQRToken, verifyQRToken } from "@/lib/qr-token";

describe("QR attendance", () => {
  it("builds student scan URLs with encoded tokens", () => {
    expect(buildScanUrl("https://lectrax.app/", "abc.def")).toBe(
      "https://lectrax.app/student/scan?token=abc.def"
    );
  });

  it("creates verifiable rotating QR tokens", () => {
    const attendanceSessionId = "11111111-1111-4111-8111-111111111111";
    const classSessionId = "22222222-2222-4222-8222-222222222222";
    const sessionExpiresAt = new Date(Date.now() + 10 * 60_000);

    const rotated = buildRotatedQRToken({
      attendanceSessionId,
      classSessionId,
      sessionExpiresAt,
    });

    expect(rotated.tokenHash).toBe(hashQRToken(rotated.token));
    const payload = verifyQRToken(rotated.token);
    expect(payload).not.toBeNull();
    expect(payload?.attendanceSessionId).toBe(attendanceSessionId);
    expect(payload?.classSessionId).toBe(classSessionId);
    expect(rotated.tokenExpiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + QR_TOKEN_TTL_SECONDS * 1000 + 50
    );
  });

  it("rejects tampered or expired tokens", () => {
    const token = createQRToken({
      attendanceSessionId: "11111111-1111-4111-8111-111111111111",
      classSessionId: "22222222-2222-4222-8222-222222222222",
      expiresAt: Date.now() - 5_000,
    });
    expect(verifyQRToken(token)).toBeNull();
    expect(verifyQRToken(`${token}x`)).toBeNull();
  });

  it("accepts tokens within the clock-skew window", () => {
    const token = createQRToken({
      attendanceSessionId: "11111111-1111-4111-8111-111111111111",
      classSessionId: "22222222-2222-4222-8222-222222222222",
      expiresAt: Date.now() - 500,
    });
    expect(verifyQRToken(token)).not.toBeNull();
  });

  it("rejects tokens with non-UUID session bindings", () => {
    const token = createQRToken({
      attendanceSessionId: "not-a-uuid",
      classSessionId: "22222222-2222-4222-8222-222222222222",
      expiresAt: Date.now() + 5_000,
    });
    // createQRToken will still sign invalid ids; verify must reject.
    expect(verifyQRToken(token)).toBeNull();
  });

  it("detects closed attendance sessions", () => {
    expect(
      isAttendanceSessionOpen({
        is_active: true,
        ended_at: null,
        session_expires_at: new Date(Date.now() + 60_000).toISOString(),
      })
    ).toBe(true);

    expect(
      isAttendanceSessionOpen({
        is_active: false,
        ended_at: null,
        session_expires_at: new Date(Date.now() + 60_000).toISOString(),
      })
    ).toBe(false);

    expect(EXPIRED_QR_MESSAGE).toContain("latest QR code");
    expect(ATTENDANCE_RECORDED_MESSAGE).toContain("successfully recorded");
  });
});
