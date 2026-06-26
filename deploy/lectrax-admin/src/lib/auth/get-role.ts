import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { isUserRole, resolveUserRoleOrNull } from "@/lib/auth/roles";
import type { UserRole } from "@/types/database";
import type { RoleResolutionResult } from "@/lib/errors/types";
import { isTransientDbError } from "@/lib/errors/classify";

/** Resolve role server-side — RPC + profile read, with auth metadata fallback. */
export async function getRoleForUserSafe(
  supabase: SupabaseClient,
  user: User,
  serviceClient?: SupabaseClient
): Promise<RoleResolutionResult> {
  const { data: rpcRole, error: rpcError } = await supabase.rpc("get_my_role");

  if (!rpcError && isUserRole(rpcRole)) {
    return { status: "ok", role: rpcRole };
  }

  if (rpcError && isTransientDbError(rpcError)) {
    return { status: "service_unavailable", error: rpcError };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError && isTransientDbError(profileError)) {
    return { status: "service_unavailable", error: profileError };
  }

  let role = resolveUserRoleOrNull(profile?.role);

  if (!role && serviceClient) {
    const { data: profileAdmin, error: adminError } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (adminError && isTransientDbError(adminError)) {
      return { status: "service_unavailable", error: adminError };
    }

    role = resolveUserRoleOrNull(profileAdmin?.role);
  }

  if (!role) {
    return { status: "no_role" };
  }

  return { status: "ok", role };
}

/** Resolve role server-side — RPC + profile read, with auth metadata fallback. */
export async function getRoleForUser(
  supabase: SupabaseClient,
  user: User,
  serviceClient?: SupabaseClient
): Promise<UserRole | null> {
  const { data: rpcRole, error: rpcError } = await supabase.rpc("get_my_role");

  if (!rpcError && isUserRole(rpcRole)) {
    return rpcRole;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  let role = resolveUserRoleOrNull(profile?.role);

  if (!role && serviceClient) {
    const { data: profileAdmin } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = resolveUserRoleOrNull(profileAdmin?.role);
  }

  return role;
}
