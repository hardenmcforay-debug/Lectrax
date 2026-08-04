import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_JSON_BODY_BYTES, readBodyWithByteLimit } from "@/lib/security/request-limits";
import { userFacingZodMessage } from "@/lib/security/zod-helpers";

export function parseRouteUuid(
  value: string,
  label = "ID"
): { ok: true; id: string } | { ok: false; response: NextResponse } {
  const parsed = z.uuid({ error: `Invalid ${label}` }).safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: userFacingZodMessage(parsed.error, `Invalid ${label}`) },
        { status: 400 }
      ),
    };
  }
  return { ok: true, id: parsed.data };
}

/** Standard 400 response for failed Zod validation. */
export function zodValidationResponse(
  error: z.ZodError,
  fallback = "Please check your input and try again."
): NextResponse {
  return NextResponse.json(
    { error: userFacingZodMessage(error, fallback) },
    { status: 400 }
  );
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
