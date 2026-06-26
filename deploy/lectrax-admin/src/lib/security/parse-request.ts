import { NextResponse } from "next/server";
import { z } from "zod";

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
  request: Request
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid request body" }, { status: 400 }),
    };
  }
}
