import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import {
  AUTH_SURFACE_HEADER,
  PWA_SCOPED_HEADER,
  getSupabaseAuthStorageKey,
  parseAuthSurface,
  type AuthSurface,
} from "@/lib/auth/auth-surface";
import { getPublicSupabaseEnv, getServiceRoleKey } from "@/lib/env";
import { withSecureCookieOptions } from "@/lib/security/cookies";

async function resolveServerAuthSurface(
  explicit?: AuthSurface
): Promise<AuthSurface> {
  if (explicit) return explicit;

  const headerStore = await headers();
  const fromHeader = parseAuthSurface(headerStore.get(AUTH_SURFACE_HEADER));
  if (fromHeader) return fromHeader;
  if (headerStore.get(PWA_SCOPED_HEADER) === "1") return "pwa";
  return "site";
}

export async function createClient(options?: { surface?: AuthSurface }) {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseEnv();
  const surface = await resolveServerAuthSurface(options?.surface);

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
        }>,
        _headers: Record<string, string>
      ) {
        void _headers;
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, withSecureCookieOptions(options))
          );
        } catch {
          // Server Component — ignore
        }
      },
    },
  });
}

/** Cookie-free client for public reads during static generation (no auth session). */
export async function createPublicReadClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const { url, anonKey } = getPublicSupabaseEnv();
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

export async function createServiceClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const { url } = getPublicSupabaseEnv();
  return createClient(url, getServiceRoleKey(), { auth: { persistSession: false } });
}
