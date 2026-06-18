import type { CookieOptions } from "@supabase/ssr";
import { isProduction } from "@/lib/security/transport";

/** Apply secure defaults to auth session cookies in production. */
export function withSecureCookieOptions(options: CookieOptions = {}): CookieOptions {
  if (!isProduction()) {
    return options;
  }

  return {
    ...options,
    secure: true,
    sameSite: options.sameSite ?? "lax",
  };
}
