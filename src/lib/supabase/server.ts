import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseEnv, getServiceRoleKey } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseEnv();

  return createServerClient(
    url,
    anonKey,
    {
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
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — ignore
          }
        },
      },
    }
  );
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
