import { NextResponse } from "next/server";
import { z } from "zod";
import { userFacingZodMessage } from "@/lib/security/zod-helpers";
import { loginIdentifierField } from "@/lib/validations";
import { resolveAuthEmailFromIdentifier } from "@/lib/auth/resolve-login-identifier";
import { rejectIfKeyRateLimited } from "@/lib/security/enforce-rate-limit";
import { logServerError } from "@/lib/errors/logger";
import { createHash } from "crypto";
import { withApiObservability } from "@/lib/observability/with-api-observability";

const resolveLoginSchema = z.object({
  identifier: loginIdentifierField,
});

function buildResolveLoginRateLimitKey(identifier: string): string {
  const hash = createHash("sha256").update(identifier.trim().toLowerCase()).digest("hex");
  return `resolveLogin:${hash.slice(0, 24)}`;
}

async function postHandler(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = resolveLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: userFacingZodMessage(parsed.error, "Invalid phone number or email address") },
        { status: 400 }
      );
    }

    const identifier = parsed.data.identifier;
    const rateLimited = await rejectIfKeyRateLimited(
      buildResolveLoginRateLimitKey(identifier),
      "resolveLogin",
      "auth.resolve-login"
    );
    if (rateLimited) return rateLimited;

    const email = await resolveAuthEmailFromIdentifier(identifier);

    if (!email) {
      return NextResponse.json(
        { error: "No account found for this phone number or email address." },
        { status: 404 }
      );
    }

    return NextResponse.json({ email });
  } catch (error) {
    logServerError("auth.resolveLogin.unhandled", error);
    return NextResponse.json({ error: "Could not resolve login identifier." }, { status: 500 });
  }
}

export const POST = withApiObservability("auth.resolve-login.post", postHandler);
