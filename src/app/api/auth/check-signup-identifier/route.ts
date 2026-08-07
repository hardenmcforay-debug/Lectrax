import { NextResponse } from "next/server";
import { z } from "zod";
import { userFacingZodMessage } from "@/lib/security/zod-helpers";
import { loginIdentifierField } from "@/lib/validations";
import { accountExistsForSignupIdentifier } from "@/lib/auth/phone-account";
import { rejectIfKeyRateLimited } from "@/lib/security/enforce-rate-limit";
import { logServerError } from "@/lib/errors/logger";
import { createHash } from "crypto";
import { withApiObservability } from "@/lib/observability/with-api-observability";

const checkSignupIdentifierSchema = z.object({
  identifier: loginIdentifierField,
});

function buildCheckSignupIdentifierRateLimitKey(identifier: string): string {
  const hash = createHash("sha256").update(identifier.trim().toLowerCase()).digest("hex");
  return `checkSignupIdentifier:${hash.slice(0, 24)}`;
}

async function postHandler(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = checkSignupIdentifierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: userFacingZodMessage(parsed.error, "Invalid phone number or email address") },
        { status: 400 }
      );
    }

    const identifier = parsed.data.identifier;
    const rateLimited = await rejectIfKeyRateLimited(
      buildCheckSignupIdentifierRateLimitKey(identifier),
      "checkSignupIdentifier",
      "auth.check-signup-identifier"
    );
    if (rateLimited) return rateLimited;

    const result = await accountExistsForSignupIdentifier(identifier);
    if (!result) {
      return NextResponse.json({ error: "Invalid phone number or email address." }, { status: 400 });
    }

    if (result.exists) {
      if (result.type === "phone") {
        return NextResponse.json(
          {
            error: "Phone Number Already Registered",
            message: "An account already exists with this phone number. Sign in instead.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: "Email Already Registered",
          message: "An account already exists with this email address. Sign in instead.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    logServerError("auth.checkSignupIdentifier.unhandled", error);
    return NextResponse.json({ error: "Could not verify signup details." }, { status: 500 });
  }
}

export const POST = withApiObservability("auth.check-signup-identifier.post", postHandler);
