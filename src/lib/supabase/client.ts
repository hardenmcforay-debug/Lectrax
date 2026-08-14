import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getClientAuthSurface,
  getSupabaseAuthStorageKey,
  type AuthSurface,
} from "@/lib/auth/auth-surface";
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from "@/lib/env/public";

const CONFIG_ERROR =
  "Authentication is unavailable because the app is misconfigured. Please contact support.";

const clientsBySurface = new Map<AuthSurface, SupabaseClient>();

export function createClient(surface: AuthSurface = getClientAuthSurface()) {
  const cached = clientsBySurface.get(surface);
  if (cached) return cached;

  const url = getPublicSupabaseUrl();
  const anonKey = getPublicSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error(CONFIG_ERROR);
  }

  const client = createBrowserClient(url, anonKey, {
    isSingleton: false,
    cookieOptions: {
      name: getSupabaseAuthStorageKey(url, surface),
      path: "/",
      sameSite: "lax",
    },
    auth: {
      // Recovery hash tokens are applied on /reset-password via setSession.
      // Auto-detect would reject implicit recovery URLs (PKCE client) and can
      // consume a one-time `code` into the wrong cookie jar (PWA vs site).
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });

  clientsBySurface.set(surface, client);
  return client;
}

export function getSupabaseConfigError(): string | null {
  const url = getPublicSupabaseUrl();
  const anonKey = getPublicSupabaseAnonKey();
  if (!url || !anonKey) return CONFIG_ERROR;
  return null;
}
