import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import {
  buildPhoneAuthEmail,
  isEmailIdentifier,
  normalizePhoneNumber,
} from "@/lib/auth/phone-number";
import { logServerError } from "@/lib/errors/logger";

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

/** Resolve the Supabase auth email used for signInWithPassword. */
export function resolveLoginEmailForSignIn(identifier: string): string | null {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (isEmailIdentifier(trimmed)) {
    return trimmed.toLowerCase();
  }

  try {
    return buildPhoneAuthEmail(normalizePhoneNumber(trimmed));
  } catch {
    return null;
  }
}

export async function getAuthUserIdByEmail(
  email: string,
  service?: ServiceClient
): Promise<string | null> {
  const supabase = service ?? (await createServiceClient());
  const normalized = email.trim().toLowerCase();

  const { data: rpcId, error: rpcError } = await supabase.rpc("get_auth_user_id_by_email", {
    check_email: normalized,
  });

  if (!rpcError && typeof rpcId === "string" && rpcId.length > 0) {
    return rpcId;
  }

  if (rpcError) {
    logServerError("auth.login.getAuthUserIdRpc", rpcError);
  }

  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      logServerError("auth.login.getAuthUserIdList", error);
      return null;
    }

    const match = data.users.find((user) => user.email?.trim().toLowerCase() === normalized);
    if (match?.id) return match.id;

    if (data.users.length < 200) break;
  }

  return null;
}

/** Confirm and repair phone-only accounts before password sign-in. */
export async function preparePhoneAccountForLogin(
  identifier: string,
  service?: ServiceClient
): Promise<void> {
  const supabase = service ?? (await createServiceClient());

  let normalizedPhone: string;
  try {
    normalizedPhone = normalizePhoneNumber(identifier);
  } catch {
    return;
  }

  const { data: profileByPhone } = await supabase
    .from("profiles")
    .select("id, phone, email")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  let userId = profileByPhone?.id ?? null;

  if (!userId) {
    const authEmail = buildPhoneAuthEmail(normalizedPhone);
    userId = await getAuthUserIdByEmail(authEmail, supabase);
  }

  if (!userId) return;

  const { data: authData, error: authReadError } = await supabase.auth.admin.getUserById(userId);
  if (authReadError || !authData.user) {
    logServerError("auth.login.prepareGetUser", authReadError);
    return;
  }

  const authEmail = authData.user.email?.trim().toLowerCase() ?? "";
  const syntheticEmail = buildPhoneAuthEmail(normalizedPhone).toLowerCase();
  if (authEmail !== syntheticEmail && !profileByPhone) {
    return;
  }

  const metadata = authData.user.user_metadata ?? {};
  const metaRole = metadata.role === "lecturer" ? "lecturer" : "student";
  const fullName =
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    authEmail.split("@")[0];

  const { error: confirmError } = await supabase.auth.admin.updateUserById(userId, {
    email_confirm: true,
    user_metadata: {
      ...metadata,
      phone: normalizedPhone,
    },
  });

  if (confirmError) {
    logServerError("auth.login.prepareConfirm", confirmError);
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, phone")
    .eq("id", userId)
    .maybeSingle();

  if (!existingProfile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      email: authEmail,
      full_name: fullName,
      role: metaRole,
      phone: normalizedPhone,
      is_active: true,
      subscription_plan: "free",
      subscription_status: "active",
    });

    if (insertError) {
      logServerError("auth.login.prepareInsertProfile", insertError);
      await supabase
        .from("profiles")
        .update({ phone: normalizedPhone, email: authEmail })
        .eq("id", userId);
    }
    return;
  }

  if (!existingProfile.phone) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ phone: normalizedPhone, email: authEmail })
      .eq("id", userId);

    if (updateError) {
      logServerError("auth.login.prepareUpdateProfile", updateError);
    }
  }
}
