import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizedRequiredPhoneField } from "@/lib/security/zod-helpers";
import { confirmPhoneOnlyAccount } from "@/lib/auth/phone-account";
import { rejectIfKeyRateLimited } from "@/lib/security/enforce-rate-limit";
import { logServerError } from "@/lib/errors/logger";
import { createHash } from "crypto";

const finalizePhoneSignupSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  phoneNumber: normalizedRequiredPhoneField,
});

function buildFinalizePhoneSignupRateLimitKey(userId: string): string {
  const hash = createHash("sha256").update(userId).digest("hex");
  return `finalizePhoneSignup:${hash.slice(0, 24)}`;
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = finalizePhoneSignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { userId, phoneNumber } = parsed.data;
    const rateLimited = rejectIfKeyRateLimited(
      buildFinalizePhoneSignupRateLimitKey(userId),
      "finalizePhoneSignup",
      "auth.finalize-phone-signup"
    );
    if (rateLimited) return rateLimited;

    const confirmed = await confirmPhoneOnlyAccount(userId, phoneNumber);
    if (!confirmed) {
      return NextResponse.json({ error: "Could not finalize phone account." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("auth.finalizePhoneSignup.unhandled", error);
    return NextResponse.json({ error: "Could not finalize phone account." }, { status: 500 });
  }
}
