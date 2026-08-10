import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";
import {
  AUTH_SURFACE_HEADER,
  PWA_SCOPED_HEADER,
  getSupabaseAuthStorageKey,
  parseAuthSurface,
  type AuthSurface,
} from "@/lib/auth/auth-surface";
import { getPublicSupabaseEnv } from "@/lib/env";
import { withSecureCookieOptions } from "@/lib/security/cookies";

async function resolveRouteHandlerAuthSurface(
  explicit?: AuthSurface
): Promise<AuthSurface> {
  if (explicit) return explicit;

  const headerStore = await headers();
  const fromHeader = parseAuthSurface(headerStore.get(AUTH_SURFACE_HEADER));
  if (fromHeader) return fromHeader;
  if (headerStore.get(PWA_SCOPED_HEADER) === "1") return "pwa";
  return "site";
}

/** Supabase client that writes session cookies onto an outgoing Route Handler response. */
export async function createRouteHandlerClient(
  response: NextResponse,
  options?: { surface?: AuthSurface }
) {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseEnv();
  const surface = await resolveRouteHandlerAuthSurface(options?.surface);

  return createServerClient(url, anonKey, {
    cookieOptions: {
      name: getSupabaseAuthStorageKey(url, surface),
      path: "/",
      sameSite: "lax",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>
      ) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const secureOptions = withSecureCookieOptions(options);
          try {
            cookieStore.set(name, value, secureOptions);
          } catch {
            // Request-scoped store may be read-only in some contexts.
          }
          response.cookies.set(name, value, secureOptions);
        });
      },
    },
  });
}
