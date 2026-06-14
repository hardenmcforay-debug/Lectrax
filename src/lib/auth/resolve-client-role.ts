import type { SupabaseClient } from "@supabase/supabase-js";
import { platformFetch } from "@/lib/api/fetch";
import { getRoleFromUser, isUserRole, resolveUserRoleOrNull } from "@/lib/auth/roles";
import type { UserRole } from "@/types/database";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function readRoleFromClient(
  supabase: SupabaseClient
): Promise<UserRole | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const metadataRole = getRoleFromUser(user);
  if (metadataRole) return metadataRole;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return null;

  return resolveUserRoleOrNull(profile?.role, user);
}

async function readRoleFromServer(): Promise<UserRole | null> {
  const result = await platformFetch<{ role?: string }>("/api/auth/role", {
    credentials: "include",
  });

  if (!result.ok || !result.data.role || !isUserRole(result.data.role)) {
    return null;
  }

  return result.data.role;
}

/** Resolve the signed-in user's role after client auth, with server fallback + retries. */
export async function resolveClientRoleAfterAuth(
  supabase: SupabaseClient
): Promise<UserRole | null> {
  await supabase.auth.getSession();

  let role = await readRoleFromClient(supabase);
  if (role) return role;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) {
      await sleep(250 * attempt);
      await supabase.auth.getSession();
    }

    role = await readRoleFromClient(supabase);
    if (role) return role;

    role = await readRoleFromServer();
    if (role) return role;
  }

  return null;
}
