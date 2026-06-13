import type { User } from "@supabase/supabase-js";
import { ROLE_ROUTES } from "@/lib/constants";
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

export function resolveUserRoleOrNull(
  profileRole: unknown,
  user?: User | null
): UserRole | null {
  if (isUserRole(profileRole)) return profileRole;
  const metaRole = getRoleFromUser(user);
  if (metaRole) return metaRole;
  return null;
}

/** Resolves role for routing; falls back to student only when a session exists (middleware). */
export function resolveUserRole(
  profileRole: unknown,
  user?: User | null
): UserRole {
  return resolveUserRoleOrNull(profileRole, user) ?? "student";
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
  return ROLE_ROUTES[role] ?? ROLE_ROUTES.student;
}

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
  const dashboard = getDashboardPath(role);
  if (!redirectParam || redirectParam === "/") return dashboard;
  if (redirectParam.startsWith(dashboard)) return redirectParam;
  return dashboard;
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
): Promise<{ role: UserRole; userId: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { role: "student", userId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    role: resolveUserRole(profile?.role, user),
    userId: user.id,
  };
}
