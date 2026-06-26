import "server-only";

import {
  buildPhoneAuthEmail,
  hasRecoverableEmail,
  isEmailIdentifier,
  normalizePhoneNumber,
} from "@/lib/auth/phone-number";
import { getPhoneAccountAuthEmail } from "@/lib/auth/phone-account";
import { getAuthUserIdByEmail } from "@/lib/auth/login-email";
import { normalizeAuthEmail } from "@/lib/auth/password-reset";
import { createServiceClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/errors/logger";

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

export async function resolveLoginEmailForSignInAsync(
  identifier: string,
  service?: ServiceClient
): Promise<string | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  const supabase = service ?? (await createServiceClient());

  if (isEmailIdentifier(trimmed)) {
    return normalizeAuthEmail(trimmed);
  }

  let normalizedPhone: string;
  try {
    normalizedPhone = normalizePhoneNumber(trimmed);
  } catch {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (profileError) {
    logServerError("auth.recoveryEmail.resolveLoginProfile", profileError);
  }

  if (profile?.id) {
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(profile.id);
    if (authError) {
      logServerError("auth.recoveryEmail.resolveLoginAuth", authError);
    } else if (authData.user?.email) {
      return authData.user.email.trim().toLowerCase();
    }
  }

  return buildPhoneAuthEmail(normalizedPhone);
}

export async function resolvePasswordResetTargetEmail(
  identifier: string,
  service?: ServiceClient
): Promise<{ exists: boolean; email: string | null; recoverable: boolean }> {
  const supabase = service ?? (await createServiceClient());
  const trimmed = identifier.trim();
  if (!trimmed) {
    return { exists: false, email: null, recoverable: false };
  }

  if (isEmailIdentifier(trimmed)) {
    const normalized = normalizeAuthEmail(trimmed);
    const userId = await getAuthUserIdByEmail(normalized, supabase);
    if (!userId) {
      return { exists: false, email: null, recoverable: false };
    }
    return { exists: true, email: normalized, recoverable: true };
  }

  let normalizedPhone: string;
  try {
    normalizedPhone = normalizePhoneNumber(trimmed);
  } catch {
    return { exists: false, email: null, recoverable: false };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, phone")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (profileError) {
    logServerError("auth.recoveryEmail.resetProfileLookup", profileError);
  }

  if (profile?.id) {
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(profile.id);
    if (authError) {
      logServerError("auth.recoveryEmail.resetAuthLookup", authError);
      return { exists: false, email: null, recoverable: false };
    }

    const authEmail = authData.user?.email?.trim().toLowerCase() ?? null;
    if (authEmail && hasRecoverableEmail(authEmail)) {
      return { exists: true, email: authEmail, recoverable: true };
    }

    const profileEmail = profile.email?.trim().toLowerCase() ?? null;
    if (profileEmail && hasRecoverableEmail(profileEmail)) {
      return { exists: true, email: profileEmail, recoverable: true };
    }

    return { exists: true, email: authEmail, recoverable: false };
  }

  const syntheticEmail = getPhoneAccountAuthEmail(normalizedPhone);
  const userId = await getAuthUserIdByEmail(syntheticEmail, supabase);
  if (!userId) {
    return { exists: false, email: null, recoverable: false };
  }

  return { exists: true, email: syntheticEmail, recoverable: false };
}

export async function applyRecoveryEmailUpdate(
  userId: string,
  recoveryEmail: string,
  service?: ServiceClient
): Promise<{ ok: true } | { ok: false; error: string; message?: string; status: number }> {
  const supabase = service ?? (await createServiceClient());
  const normalized = normalizeAuthEmail(recoveryEmail);

  const existingUserId = await getAuthUserIdByEmail(normalized, supabase);
  if (existingUserId && existingUserId !== userId) {
    return {
      ok: false,
      error: "Email Already Registered",
      message: "An account already exists with this email address.",
      status: 409,
    };
  }

  const { data: authData, error: authReadError } = await supabase.auth.admin.getUserById(userId);
  if (authReadError || !authData.user) {
    logServerError("auth.recoveryEmail.readUser", authReadError);
    return {
      ok: false,
      error: "Could not update recovery email.",
      status: 500,
    };
  }

  const metadata = authData.user.user_metadata ?? {};

  const { error: updateAuthError } = await supabase.auth.admin.updateUserById(userId, {
    email: normalized,
    email_confirm: true,
    user_metadata: {
      ...metadata,
      contact_email: normalized,
    },
  });

  if (updateAuthError) {
    logServerError("auth.recoveryEmail.updateAuth", updateAuthError);
    return {
      ok: false,
      error: "Could not update recovery email. Please try again.",
      status: 500,
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ email: normalized })
    .eq("id", userId);

  if (profileError) {
    logServerError("auth.recoveryEmail.updateProfile", profileError);
    return {
      ok: false,
      error: "Could not save recovery email to your profile.",
      status: 500,
    };
  }

  return { ok: true };
}
