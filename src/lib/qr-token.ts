import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getQrTokenSecret } from "@/lib/env";

export interface QRTokenPayload {
  attendanceSessionId: string;
  classSessionId: string;
  expiresAt: number;
  nonce: string;
}

/** Small skew so student devices slightly behind the server still accept fresh tokens. */
const QR_TOKEN_CLOCK_SKEW_MS = 2_000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSecret(): string {
  return getQrTokenSecret();
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function createQRToken(payload: Omit<QRTokenPayload, "nonce">): string {
  const full: QRTokenPayload = {
    ...payload,
    nonce: randomBytes(8).toString("hex"),
  };
  const data = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyQRToken(token: string): QRTokenPayload | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expected = createHmac("sha256", getSecret()).update(data).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as QRTokenPayload;
    if (!isUuid(payload.attendanceSessionId) || !isUuid(payload.classSessionId)) {
      return null;
    }
    if (typeof payload.expiresAt !== "number" || !Number.isFinite(payload.expiresAt)) {
      return null;
    }
    if (Date.now() > payload.expiresAt + QR_TOKEN_CLOCK_SKEW_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashQRToken(token: string): string {
  return createHmac("sha256", getSecret()).update(token).digest("hex");
}
