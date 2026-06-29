import type { User } from "@supabase/supabase-js";
import {
  getRoleHomePath,
  getRoleHomeUrl,
} from "@/lib/auth/admin-deployment";
import type { UserRole } from "@/types/database";

const VALID_ROLES: UserRole[] = ["platform_admin", "lecturer", "student"];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && VALID_ROLES.includes(value as UserRole);
}

export function getRoleFromUser(user: User | null | undefined): UserRole | null {
  if (!user) return null;
  const meta = user.user_metadata?.role ?? user.app_metadata?.role;
  return isUserRole(meta) ? meta : null;
}

export function resolveUserRoleOrNull(profileRole: unknown): UserRole | null {
  if (isUserRole(profileRole)) return profileRole;
  return null;
}

/** @deprecated Do not use for authorization — metadata is client-influenceable. */
export function resolveUserRoleFromMetadata(user?: User | null): UserRole | null {
  return getRoleFromUser(user);
}

export function resolveUserRole(profileRole: unknown): UserRole {
  return resolveUserRoleOrNull(profileRole) ?? "student";
}

export const LANDING_URL = "/";
export const LOGIN_FAILED_QUERY = "login_failed";

/** Server-side redirect target when auth fails (OAuth callback, middleware, etc.). */
export function getLoginFailureUrl(origin: string, message = "auth"): string {
  const url = new URL("/login", origin);
  url.searchParams.set("error", message);
  return url.toString();
}

/** Server-side redirect target when signup/auth callback fails on signup flow. */
export function getSignupFailureUrl(origin: string, message = "signup"): string {
  const url = new URL("/signup", origin);
  url.searchParams.set("error", message);
  return url.toString();
}

/** @deprecated Prefer inline errors on /login; kept for any legacy callers. */
export function redirectToLandingOnLoginFailure() {
  if (typeof window !== "undefined") {
    window.location.replace(`/login?error=auth`);
  }
}

export function getDashboardPath(role: UserRole): string {
  return getRoleHomePath(role);
}

/** Absolute or relative home URL depending on deployment split. */
export { getRoleHomeUrl } from "@/lib/auth/admin-deployment";

export const ROLE_LABELS: Record<UserRole, string> = {
  platform_admin: "Platform Admin",
  lecturer: "Lecturer",
  student: "Student",
};

/** Safe post-login destination for the user's role (ignores cross-role redirect params). */
export function resolvePostLoginRedirect(
  role: UserRole,
  redirectParam?: string | null
): string {
  const dashboard = getRoleHomePath(role);
  const home = getRoleHomeUrl(role);
  if (!redirectParam || redirectParam === "/") return home;
  if (redirectParam.startsWith(dashboard)) {
    if (/^https?:\/\//i.test(home)) {
      const adminOrigin = home.slice(0, home.length - dashboard.length);
      return `${adminOrigin.replace(/\/$/, "")}${redirectParam}`;
    }
    return redirectParam;
  }
  return home;
}

export function redirectAfterAuth(role: UserRole, redirectParam?: string | null) {
  if (typeof window !== "undefined") {
    window.location.replace(resolvePostLoginRedirect(role, redirectParam));
  }
}

export async function fetchUserRole(
  supabase: {
    auth: { getUser: () => Promise<{ data: { user: User | null } }> };
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { role?: string } | null; error: unknown }>;
        };
      };
    };
  }
): Promise<{ role: UserRole | null; userId: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { role: null, userId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = resolveUserRoleOrNull(profile?.role);
  return {
    role,
    userId: user.id,
  };
}
