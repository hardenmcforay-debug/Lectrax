import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_JSON_BODY_BYTES, readBodyWithByteLimit } from "@/lib/security/request-limits";

export function parseRouteUuid(
  value: string,
  label = "ID"
): { ok: true; id: string } | { ok: false; response: NextResponse } {
  const parsed = z.string().uuid(`Invalid ${label}`).safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? `Invalid ${label}` },
        { status: 400 }
      ),
    };
  }
  return { ok: true, id: parsed.data };
}

export async function parseJsonBody(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  const raw = await readBodyWithByteLimit(request, maxBytes);
  if (!raw.ok) return raw;

  if (raw.bytes.byteLength === 0) {
    return { ok: true, body: {} };
  }

  try {
    const text = new TextDecoder().decode(raw.bytes);
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid request body" }, { status: 400 }),
    };
  }
}
