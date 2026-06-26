import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getPublicSupabaseEnv } from "@/lib/env";
import { withSecureCookieOptions } from "@/lib/security/cookies";

/** Supabase client that writes session cookies onto an outgoing Route Handler response. */
export async function createRouteHandlerClient(response: NextResponse) {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseEnv();

  return createServerClient(url, anonKey, {
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
