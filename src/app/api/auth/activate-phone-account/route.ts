import { NextResponse } from "next/server";
import { z } from "zod";
import { loginIdentifierField } from "@/lib/validations";
import { activatePhoneOnlyAccountByIdentifier } from "@/lib/auth/phone-account";
import { isEmailIdentifier } from "@/lib/auth/phone-number";
import { rejectIfKeyRateLimited } from "@/lib/security/enforce-rate-limit";
import { logServerError } from "@/lib/errors/logger";
import { createHash } from "crypto";

const activatePhoneAccountSchema = z.object({
  identifier: loginIdentifierField,
});

function buildActivatePhoneAccountRateLimitKey(identifier: string): string {
  const hash = createHash("sha256").update(identifier.trim().toLowerCase()).digest("hex");
  return `activatePhoneAccount:${hash.slice(0, 24)}`;
}

/** Best-effort activation for phone-only accounts stuck behind email confirmation. */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = activatePhoneAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid phone number" },
        { status: 400 }
      );
    }

    const identifier = parsed.data.identifier;
    if (isEmailIdentifier(identifier)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const rateLimited = rejectIfKeyRateLimited(
      buildActivatePhoneAccountRateLimitKey(identifier),
      "activatePhoneAccount",
      "auth.activate-phone-account"
    );
    if (rateLimited) return rateLimited;

    const activated = await activatePhoneOnlyAccountByIdentifier(identifier);
    return NextResponse.json({ ok: activated });
  } catch (error) {
    logServerError("auth.activatePhoneAccount.unhandled", error);
    return NextResponse.json({ error: "Could not activate phone account." }, { status: 500 });
  }
}
