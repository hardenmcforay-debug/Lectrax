import type { CookieOptions } from "@supabase/ssr";
import { isProduction } from "@/lib/security/transport";

/** Supabase SSR default session lifetime (~400 days). Documented for audits; not overridden. */
export const SUPABASE_AUTH_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/** Recognize Supabase auth session cookies (including chunked `*.0`, `*.1`, …). */
export function isSupabaseAuthCookieName(name: string): boolean {
  return (
    name.includes("-auth-token") || (name.startsWith("sb-") && name.includes("auth"))
  );
}

/**
 * Apply secure defaults to Supabase auth session cookies.
 * HttpOnly is intentionally not forced — @supabase/ssr requires JS-readable cookies
 * for browser session refresh (see COOKIE_SECURITY_REPORT.md).
 */
export function withSecureCookieOptions(options: CookieOptions = {}): CookieOptions {
  const merged: CookieOptions = {
    ...options,
    path: options.path ?? "/",
    sameSite: options.sameSite ?? "lax",
  };

  if (!isProduction()) {
    return merged;
  }

  return {
    ...merged,
    secure: true,
  };
}

export function hasSupabaseAuthCookies(
  cookies: Array<{ name: string; value?: string }>
): boolean {
  return cookies.some((cookie) => isSupabaseAuthCookieName(cookie.name));
}
