import { isSupabaseAuthCookieName } from "@/lib/security/cookies";

/** Detect Supabase auth cookies in the browser (client-only). */
export function hasClientSupabaseAuthCookies(): boolean {
  if (typeof document === "undefined") return false;

  // HttpOnly auth cookies are not visible in document.cookie; this is a best-effort
  // fast path — session restore still uses supabase.auth.getSession().
  return document.cookie.split(";").some((part) => {
    const name = part.trim().split("=")[0] ?? "";
    return isSupabaseAuthCookieName(name);
  });
}
