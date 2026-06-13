import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getDashboardPath } from "@/lib/auth/roles";
import { getRoleForUserSafe } from "@/lib/auth/get-role";
import { getCachedAuthUser } from "@/lib/auth/session";
import type { UserRole } from "@/types/database";
import type { User } from "@supabase/supabase-js";

export type RoleLayoutGuardResult =
  | { status: "ok"; user: User; role: UserRole }
  | { status: "redirect"; href: string }
  | { status: "service_unavailable" };

export async function requireRoleLayout(requiredRole: UserRole): Promise<RoleLayoutGuardResult> {
  const auth = await getCachedAuthUser();

  if (auth.status === "service_unavailable") {
    return { status: "service_unavailable" };
  }

  if (auth.status === "unauthenticated") {
    return { status: "redirect", href: "/login" };
  }

  const service = await createServiceClient();
  const supabase = await createClient();
  const roleResult = await getRoleForUserSafe(supabase, auth.user, service);

  if (roleResult.status === "service_unavailable") {
    return { status: "service_unavailable" };
  }

  if (roleResult.status === "no_role") {
    return { status: "redirect", href: "/login?error=auth" };
  }

  if (roleResult.role !== requiredRole) {
    return { status: "redirect", href: getDashboardPath(roleResult.role) };
  }

  return { status: "ok", user: auth.user, role: roleResult.role };
}
