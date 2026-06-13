import { createQRToken, hashQRToken } from "@/lib/qr-token";
import { QR_TOKEN_TTL_SECONDS } from "@/lib/attendance/constants";

/**
 * Builds a new QR token and hash. Each call replaces the previous token —
 * only the latest hash stored in attendance_sessions.qr_token_hash is accepted.
 */
export function buildRotatedQRToken(params: {
  attendanceSessionId: string;
  classSessionId: string;
  sessionExpiresAt: Date;
}): {
  token: string;
  tokenHash: string;
  tokenExpiresAt: Date;
} {
  const now = Date.now();
  const sessionExpiresMs = params.sessionExpiresAt.getTime();
  const tokenExpiresMs = Math.min(now + QR_TOKEN_TTL_SECONDS * 1000, sessionExpiresMs);

  const token = createQRToken({
    attendanceSessionId: params.attendanceSessionId,
    classSessionId: params.classSessionId,
    expiresAt: tokenExpiresMs,
  });

  return {
    token,
    tokenHash: hashQRToken(token),
    tokenExpiresAt: new Date(tokenExpiresMs),
  };
}

export function buildScanUrl(appUrl: string, token: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/student/scan?token=${encodeURIComponent(token)}`;
}

export function invalidSessionTokenHash(attendanceSessionId: string): string {
  return hashQRToken(`CLOSED:${attendanceSessionId}:${Date.now()}`);
}
