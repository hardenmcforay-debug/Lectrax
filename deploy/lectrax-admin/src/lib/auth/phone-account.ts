import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import {
  getAuthUserIdByEmail,
  preparePhoneAccountForLogin,
} from "@/lib/auth/login-email";
import {
  buildPhoneAuthEmail,
  isEmailIdentifier,
  normalizePhoneNumber,
} from "@/lib/auth/phone-number";
import { logServerError } from "@/lib/errors/logger";

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

/** Auth email used by Supabase for a phone-only account. */
export function getPhoneAccountAuthEmail(normalizedPhone: string): string {
  return buildPhoneAuthEmail(normalizedPhone);
}

export async function authUserExistsByEmail(
  email: string,
  service?: ServiceClient
): Promise<boolean> {
  const supabase = service ?? (await createServiceClient());
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const { data: profileMatch, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (profileError) {
    logServerError("auth.phoneAccount.lookupProfileEmail", profileError);
  } else if (profileMatch?.id) {
    return true;
  }

  const { data: registered, error: rpcError } = await supabase.rpc(
    "is_auth_email_registered",
    { check_email: normalized }
  );

  if (!rpcError && registered === true) {
    return true;
  }

  if (rpcError) {
    logServerError("auth.phoneAccount.lookupAuthEmailRpc", rpcError);
    const { data: authList, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      logServerError("auth.phoneAccount.lookupAuthEmailList", listError);
      return false;
    }

    return authList.users.some((user) => user.email?.trim().toLowerCase() === normalized);
  }

  return false;
}

export async function profileExistsForPhoneAccount(
  phone: string,
  service?: ServiceClient
): Promise<boolean> {
  const supabase = service ?? (await createServiceClient());
  const normalizedPhone = normalizePhoneNumber(phone);
  const authEmail = getPhoneAccountAuthEmail(normalizedPhone);

  const { data: byPhone, error: phoneError } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (phoneError) {
    logServerError("auth.phoneAccount.lookupByPhone", phoneError);
  } else if (byPhone?.id) {
    return true;
  }

  const { data: byEmail, error: emailError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", authEmail)
    .maybeSingle();

  if (emailError) {
    logServerError("auth.phoneAccount.lookupByEmail", emailError);
  } else if (byEmail?.id) {
    return true;
  }

  return authUserExistsByEmail(authEmail, supabase);
}

export async function accountExistsForSignupIdentifier(
  identifier: string,
  service?: ServiceClient
): Promise<{ exists: boolean; type: "email" | "phone" } | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  const supabase = service ?? (await createServiceClient());

  if (isEmailIdentifier(trimmed)) {
    const email = trimmed.toLowerCase();
    const exists = await authUserExistsByEmail(email, supabase);
    return { exists, type: "email" };
  }

  let normalizedPhone: string;
  try {
    normalizedPhone = normalizePhoneNumber(trimmed);
  } catch {
    return null;
  }

  const exists = await profileExistsForPhoneAccount(normalizedPhone, supabase);
  return { exists, type: "phone" };
}

export async function ensurePhoneProfileLinked(
  userId: string,
  normalizedPhone: string,
  service?: ServiceClient
): Promise<void> {
  const supabase = service ?? (await createServiceClient());

  const { error } = await supabase
    .from("profiles")
    .update({ phone: normalizedPhone })
    .eq("id", userId);

  if (error) {
    logServerError("auth.phoneAccount.ensureProfilePhone", error);
  }
}

export async function confirmPhoneOnlyAccount(
  userId: string,
  normalizedPhone: string,
  service?: ServiceClient
): Promise<boolean> {
  const supabase = service ?? (await createServiceClient());
  const expectedAuthEmail = getPhoneAccountAuthEmail(normalizedPhone);

  const { data: authData, error: authReadError } = await supabase.auth.admin.getUserById(userId);
  if (authReadError || !authData.user) {
    logServerError("auth.phoneAccount.getUser", authReadError);
    return false;
  }

  const userEmail = authData.user.email?.trim().toLowerCase() ?? "";
  if (userEmail !== expectedAuthEmail.toLowerCase()) {
    return false;
  }

  const { error: confirmError } = await supabase.auth.admin.updateUserById(userId, {
    email_confirm: true,
    user_metadata: {
      ...authData.user.user_metadata,
      phone: normalizedPhone,
    },
  });

  if (confirmError) {
    logServerError("auth.phoneAccount.confirm", confirmError);
    return false;
  }

  await ensurePhoneProfileLinked(userId, normalizedPhone, supabase);

  return true;
}

export async function activatePhoneOnlyAccountByIdentifier(
  identifier: string,
  service?: ServiceClient
): Promise<boolean> {
  const supabase = service ?? (await createServiceClient());

  let normalizedPhone: string;
  try {
    normalizedPhone = normalizePhoneNumber(identifier);
  } catch {
    return false;
  }

  const authEmail = getPhoneAccountAuthEmail(normalizedPhone);
  const userId = await getAuthUserIdByEmail(authEmail, supabase);
  if (!userId) {
    return false;
  }

  const { data: authData, error: authReadError } = await supabase.auth.admin.getUserById(userId);
  if (authReadError || !authData.user) {
    logServerError("auth.phoneAccount.activateGetUser", authReadError);
    return false;
  }

  if (authData.user.email?.trim().toLowerCase() !== authEmail.toLowerCase()) {
    return false;
  }

  await preparePhoneAccountForLogin(identifier, supabase);
  return true;
}
