import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from "@/lib/env/public";

const CONFIG_ERROR =
  "Authentication is unavailable because the app is misconfigured. Please contact support.";

export function createClient() {
  const url = getPublicSupabaseUrl();
  const anonKey = getPublicSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error(CONFIG_ERROR);
  }

  return createBrowserClient(url, anonKey);
}

export function getSupabaseConfigError(): string | null {
  const url = getPublicSupabaseUrl();
  const anonKey = getPublicSupabaseAnonKey();
  if (!url || !anonKey) return CONFIG_ERROR;
  return null;
}
