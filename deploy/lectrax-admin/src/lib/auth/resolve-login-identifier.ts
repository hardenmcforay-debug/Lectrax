import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { normalizeAuthEmail } from "@/lib/auth/password-reset";
import {
  authUserExistsByEmail,
  getPhoneAccountAuthEmail,
  profileExistsForPhoneAccount,
} from "@/lib/auth/phone-account";
import {
  isEmailIdentifier,
  normalizePhoneNumber,
} from "@/lib/auth/phone-number";
import { logServerError } from "@/lib/errors/logger";

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

export async function resolveAuthEmailFromIdentifier(
  identifier: string,
  service?: ServiceClient
): Promise<string | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  const supabase = service ?? (await createServiceClient());

  if (isEmailIdentifier(trimmed)) {
    const normalized = normalizeAuthEmail(trimmed);
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("email", normalized)
      .maybeSingle();

    if (error) {
      logServerError("auth.resolveIdentifier.emailLookup", error);
    } else if (data?.email) {
      return normalized;
    }

    const existsInAuth = await authUserExistsByEmail(normalized, supabase);
    return existsInAuth ? normalized : null;
  }

  let normalizedPhone: string;
  try {
    normalizedPhone = normalizePhoneNumber(trimmed);
  } catch {
    return null;
  }

  const exists = await profileExistsForPhoneAccount(normalizedPhone, supabase);
  if (!exists) {
    return null;
  }

  return getPhoneAccountAuthEmail(normalizedPhone);
}

export async function profileExistsForPhone(
  phone: string,
  service?: ServiceClient
): Promise<boolean> {
  return profileExistsForPhoneAccount(phone, service);
}
