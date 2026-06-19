import "server-only";

import { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/env";
import { logServerError } from "@/lib/errors/logger";
import { PASSWORD_RESET_SUCCESS_MESSAGE } from "@/lib/auth/password-reset-constants";

export { PASSWORD_RESET_SUCCESS_MESSAGE };

/** Minimum response time to reduce email-existence timing probes. */
export const PASSWORD_RESET_MIN_RESPONSE_MS = 450;

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildPasswordResetEmailRateLimitKey(email: string): string {
  const hash = createHash("sha256").update(normalizeAuthEmail(email)).digest("hex");
  return `email:${hash.slice(0, 24)}:passwordReset`;
}

export async function authAccountExistsForEmail(
  email: string,
  service?: ServiceClient
): Promise<boolean> {
  const supabase = service ?? (await createServiceClient());
  const normalized = normalizeAuthEmail(email);

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (error) {
    logServerError("auth.passwordReset.lookup", error);
    return false;
  }

  return Boolean(data?.id);
}

export async function sendPasswordResetEmail(params: {
  email: string;
  redirectOrigin?: string;
  service?: ServiceClient;
}): Promise<boolean> {
  const supabase = params.service ?? (await createServiceClient());
  const normalized = normalizeAuthEmail(params.email);
  const redirectTo = `${getAppUrl(params.redirectOrigin)}/auth/callback?type=recovery`;

  const { error } = await supabase.auth.resetPasswordForEmail(normalized, { redirectTo });

  if (error) {
    logServerError("auth.passwordReset.send", error);
    return false;
  }

  return true;
}

export async function waitForMinimumResponseTime(
  startedAt: number,
  minimumMs = PASSWORD_RESET_MIN_RESPONSE_MS
): Promise<void> {
  const remaining = minimumMs - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}
