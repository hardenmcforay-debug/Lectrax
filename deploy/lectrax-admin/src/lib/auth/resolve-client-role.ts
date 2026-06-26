import type { SupabaseClient } from "@supabase/supabase-js";
import { platformFetch } from "@/lib/api/fetch";
import { isUserRole, resolveUserRoleOrNull } from "@/lib/auth/roles";
import { isNetworkAuthError } from "@/lib/errors/map-auth-error";
import type { UserRole } from "@/types/database";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export type ResolveClientRoleResult = {
  role: UserRole | null;
  networkFailure: boolean;
};

async function readRoleFromClient(
  supabase: SupabaseClient
): Promise<{ role: UserRole | null; networkFailure: boolean }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { role: null, networkFailure: isNetworkAuthError(userError) };
  }

  if (!user) return { role: null, networkFailure: false };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { role: null, networkFailure: isNetworkAuthError(profileError) };
  }

  return {
    role: resolveUserRoleOrNull(profile?.role),
    networkFailure: false,
  };
}

async function readRoleFromServer(): Promise<{ role: UserRole | null; networkFailure: boolean }> {
  const result = await platformFetch<{ role?: string }>("/api/auth/role", {
    credentials: "include",
  });

  if (!result.ok) {
    return {
      role: null,
      networkFailure: result.error.category === "network" || result.error.category === "supabase",
    };
  }

  if (!result.data.role || !isUserRole(result.data.role)) {
    return { role: null, networkFailure: false };
  }

  return { role: result.data.role, networkFailure: false };
}

/** Resolve the signed-in user's role after client auth, with server fallback + retries. */
export async function resolveClientRoleAfterAuth(
  supabase: SupabaseClient
): Promise<ResolveClientRoleResult> {
  await supabase.auth.getSession();

  let networkFailure = false;

  const initial = await readRoleFromClient(supabase);
  if (initial.role) {
    return { role: initial.role, networkFailure: false };
  }
  networkFailure = networkFailure || initial.networkFailure;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) {
      await sleep(250 * attempt);
      await supabase.auth.getSession();
    }

    const clientResult = await readRoleFromClient(supabase);
    if (clientResult.role) {
      return { role: clientResult.role, networkFailure: false };
    }
    networkFailure = networkFailure || clientResult.networkFailure;

    const serverResult = await readRoleFromServer();
    if (serverResult.role) {
      return { role: serverResult.role, networkFailure: false };
    }
    networkFailure = networkFailure || serverResult.networkFailure;
  }

  return { role: null, networkFailure };
}
