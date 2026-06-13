import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AuthSessionResult } from "@/lib/errors/types";
import { isDefinitiveAuthError, isTransientError } from "@/lib/errors/classify";
import { createClient } from "@/lib/supabase/server";

function safeSerialize(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function resolveAuthUser(
  supabase: SupabaseClient
): Promise<AuthSessionResult & { user?: User }> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      if (isDefinitiveAuthError(error)) {
        return { status: "unauthenticated" };
      }

      if (isTransientError(error)) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[auth.getUser] Transient auth failure (handled): ${safeSerialize(error)}`
          );
        }
        return { status: "service_unavailable", error };
      }

      if (process.env.NODE_ENV === "development") {
        console.warn(`[auth.getUser] Unclassified auth error (handled): ${safeSerialize(error)}`);
      }
      return { status: "service_unavailable", error };
    }

    if (!user) {
      return { status: "unauthenticated" };
    }

    return { status: "authenticated", user };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[auth.getUser] Auth network failure (handled): ${safeSerialize(error)}`);
    }
    return { status: "service_unavailable", error };
  }
}

/** Per-request cached auth lookup — dedupes layout + page auth checks. */
export const getCachedAuthUser = cache(async () => {
  const supabase = await createClient();
  return resolveAuthUser(supabase);
});

export async function getAuthUserSafe(
  supabase: SupabaseClient
): Promise<AuthSessionResult & { user?: User }> {
  return resolveAuthUser(supabase);
}
