import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getRoleHomeUrl } from "@/lib/auth/admin-deployment";
import { getRoleForUserSafe } from "@/lib/auth/get-role";
import { getCachedAuthUser } from "@/lib/auth/session";
import { toPwaScopePath } from "@/lib/pwa/scope";
import type { UserRole } from "@/types/database";
import type { User } from "@supabase/supabase-js";

export type RoleLayoutGuardResult =
  | { status: "ok"; user: User; role: UserRole }
  | { status: "redirect"; href: string }
  | { status: "service_unavailable" };

function scopeAppHref(href: string, pwaScoped: boolean): string {
  if (!pwaScoped || /^https?:\/\//i.test(href)) return href;
  const [path, query] = href.split("?");
  const scoped = toPwaScopePath(path || "/login");
  return query ? `${scoped}?${query}` : scoped;
}

export async function requireRoleLayout(requiredRole: UserRole): Promise<RoleLayoutGuardResult> {
  const headerStore = await headers();
  const pwaScoped = headerStore.get("x-lectrax-pwa-scoped") === "1";
  const auth = await getCachedAuthUser();

  if (auth.status === "service_unavailable") {
    return { status: "service_unavailable" };
  }

  if (auth.status === "unauthenticated") {
    return { status: "redirect", href: scopeAppHref("/login", pwaScoped) };
  }

  let service;
  try {
    service = await createServiceClient();
  } catch {
    return { status: "service_unavailable" };
  }

  const supabase = await createClient();
  const roleResult = await getRoleForUserSafe(supabase, auth.user, service);

  if (roleResult.status === "service_unavailable") {
    return { status: "service_unavailable" };
  }

  if (roleResult.status === "no_role") {
    return { status: "redirect", href: scopeAppHref("/login?error=auth", pwaScoped) };
  }

  if (roleResult.role !== requiredRole) {
    return { status: "redirect", href: scopeAppHref(getRoleHomeUrl(roleResult.role), pwaScoped) };
  }

  return { status: "ok", user: auth.user, role: roleResult.role };
}
