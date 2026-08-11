import { NextResponse } from "next/server";
import { userFacingZodMessage } from "@/lib/security/zod-helpers";
import { loginSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import { isEmailIdentifier } from "@/lib/auth/phone-number";
import { preparePhoneAccountForLogin } from "@/lib/auth/login-email";
import { resolveLoginEmailForSignInAsync } from "@/lib/auth/recovery-email";
import { isServiceRoleConfigured } from "@/lib/env";
import { rejectIfKeyRateLimited } from "@/lib/security/enforce-rate-limit";
import { logServerError } from "@/lib/errors/logger";
import { BUSINESS_EVENTS, trackBusinessEvent } from "@/lib/observability/business-events";
import { bindObservabilityUser } from "@/lib/observability/request-store";
import { createHash } from "crypto";
import { withApiObservability } from "@/lib/observability/with-api-observability";


function buildLoginRateLimitKey(identifier: string): string {
  const hash = createHash("sha256").update(identifier.trim().toLowerCase()).digest("hex");
  return `authLogin:${hash.slice(0, 24)}`;
}

function loginFailureMessage(authMessage: string): string {
  if (/email not confirmed/i.test(authMessage)) {
    return "Your account is not activated yet. Please try again in a moment or contact support.";
  }
  return "Sign in failed. Please check your phone number or email and password.";
}

async function postHandler(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: userFacingZodMessage(parsed.error, "Invalid login details") },
        { status: 400 }
      );
    }

    const { identifier, password } = parsed.data;
    const rateLimited = await rejectIfKeyRateLimited(
      buildLoginRateLimitKey(identifier),
      "authLogin",
      "auth.login"
    );
    if (rateLimited) return rateLimited;

    const loginEmail = await resolveLoginEmailForSignInAsync(identifier);
    if (!loginEmail) {
      trackBusinessEvent(BUSINESS_EVENTS.LOGIN_FAILURE, {
        reason: "invalid_identifier",
      });
      return NextResponse.json(
        { error: "Enter a valid phone number or email address." },
        { status: 400 }
      );
    }

    if (!isEmailIdentifier(identifier) && isServiceRoleConfigured()) {
      await preparePhoneAccountForLogin(identifier);
    }

    const supabase = await createClient();
    const authResult = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    const authError = authResult?.error ?? null;
    const authUserId = authResult?.data?.user?.id ?? null;

    if (authError) {
      trackBusinessEvent(BUSINESS_EVENTS.LOGIN_FAILURE, {
        reason: "invalid_credentials",
      });
      return NextResponse.json(
        { error: loginFailureMessage(authError.message) },
        { status: 401 }
      );
    }

    bindObservabilityUser(authUserId);
    trackBusinessEvent(BUSINESS_EVENTS.LOGIN_SUCCESS, {}, { userId: authUserId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("auth.login.unhandled", error);
    trackBusinessEvent(BUSINESS_EVENTS.LOGIN_FAILURE, { reason: "unhandled" });
    return NextResponse.json(
      { error: "Sign in failed. Please try again." },
      { status: 500 }
    );
  }
}

export const POST = withApiObservability("auth.login.post", postHandler);
