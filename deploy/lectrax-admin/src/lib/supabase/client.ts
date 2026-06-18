import { createBrowserClient } from "@supabase/ssr";
import { validateHttpsUrl } from "@/lib/security/transport";

const CONFIG_ERROR =
  "Authentication is unavailable because the app is misconfigured. Please contact support.";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(CONFIG_ERROR);
  }

  const httpsError = validateHttpsUrl("NEXT_PUBLIC_SUPABASE_URL", url, { required: true });
  if (httpsError) {
    throw new Error(CONFIG_ERROR);
  }

  return createBrowserClient(url, anonKey);
}

export function getSupabaseConfigError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return CONFIG_ERROR;
  return null;
}
