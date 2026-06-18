import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getQrTokenSecret } from "@/lib/env";

export interface QRTokenPayload {
  attendanceSessionId: string;
  classSessionId: string;
  expiresAt: number;
  nonce: string;
}

function getSecret(): string {
  return getQrTokenSecret();
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
    if (Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashQRToken(token: string): string {
  return createHmac("sha256", getSecret()).update(token).digest("hex");
}
