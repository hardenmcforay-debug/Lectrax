/**
 * Client-safe access to NEXT_PUBLIC_* environment variables only.
 * Never import server secrets from this module.
 */

export function getPublicSupabaseUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function getPublicSupabaseAnonKey(): string | undefined {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function getPublicAppUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return value && value.length > 0 ? value.replace(/\/$/, "") : undefined;
}
