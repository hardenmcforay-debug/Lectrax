import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCachedAuthUser } from "@/lib/auth/session";
import { getRoleForUserSafe } from "@/lib/auth/get-role";
import { getRoleHomeUrl } from "@/lib/auth/admin-deployment";

/** Dashboard path for signed-in users opening `/`, or null when landing should show. */
export async function getAuthenticatedHomeRedirect(): Promise<string | null> {
  const auth = await getCachedAuthUser();

  if (auth.status !== "authenticated") {
    return null;
  }

  const supabase = await createClient();

  let service;
  try {
    service = await createServiceClient();
  } catch {
    return null;
  }

  const roleResult = await getRoleForUserSafe(supabase, auth.user, service);

  if (roleResult.status !== "ok") {
    return null;
  }

  return getRoleHomeUrl(roleResult.role);
}
