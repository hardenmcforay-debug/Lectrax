import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authAccountExistsForIdentifier,
  buildPasswordResetRateLimitKey,
  PASSWORD_RESET_SUCCESS_MESSAGE,
  sendPasswordResetEmail,
  waitForMinimumResponseTime,
} from "@/lib/auth/password-reset";
import { rejectIfKeyRateLimited } from "@/lib/security/enforce-rate-limit";
import { logServerError } from "@/lib/errors/logger";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const identifierLimitKey = (identifier: string) =>
      rejectIfKeyRateLimited(
        buildPasswordResetRateLimitKey(identifier),
        "passwordResetEmail",
        "auth.forgot-password.identifier"
      );

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid phone number or email address" },
        { status: 400 }
      );
    }

    const identifier = parsed.data.identifier;
    const identifierLimited = identifierLimitKey(identifier);
    if (identifierLimited) return identifierLimited;

    const service = await createServiceClient();
    const account = await authAccountExistsForIdentifier(identifier, service);

    if (account.exists && account.email && account.recoverable) {
      await sendPasswordResetEmail({
        email: account.email,
        redirectOrigin: new URL(request.url).origin,
        service,
      });
    }

    const { error: auditError } = await service.from("audit_logs").insert({
      actor_id: null,
      action: "password_reset_requested",
      entity_type: "auth",
      entity_id: null,
      metadata: {
        outcome: account.exists
          ? account.recoverable
            ? "email_attempted"
            : "suppressed_no_contact_email"
          : "suppressed",
        client_ip: getClientIp(request),
      },
    });

    if (auditError) {
      logServerError("auth.passwordReset.audit", auditError);
    }

    return NextResponse.json({ message: PASSWORD_RESET_SUCCESS_MESSAGE });
  } catch (error) {
    logServerError("auth.passwordReset.unhandled", error);
    return NextResponse.json({ message: PASSWORD_RESET_SUCCESS_MESSAGE });
  } finally {
    await waitForMinimumResponseTime(startedAt);
  }
}
