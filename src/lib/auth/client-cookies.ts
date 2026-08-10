import {
  getClientAuthSurface,
  isPwaAuthCookieName,
} from "@/lib/auth/auth-surface";
import { isSupabaseAuthCookieName } from "@/lib/security/cookies";

/** Detect Supabase auth cookies for the current surface (client-only). */
export function hasClientSupabaseAuthCookies(): boolean {
  if (typeof document === "undefined") return false;

  const surface = getClientAuthSurface();

  // HttpOnly auth cookies are not visible in document.cookie; this is a best-effort
  // fast path — session restore still uses supabase.auth.getSession().
  return document.cookie.split(";").some((part) => {
    const name = part.trim().split("=")[0] ?? "";
    if (!isSupabaseAuthCookieName(name)) return false;
    const isPwaCookie = isPwaAuthCookieName(name);
    return surface === "pwa" ? isPwaCookie : !isPwaCookie;
  });
}
