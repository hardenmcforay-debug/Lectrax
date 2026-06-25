import { getPublicSupabaseUrl } from "@/lib/env/public";

export const LANDING_ASSETS_BUCKET = "landing-assets";

/** Public Supabase storage URL for landing branding assets (client-safe). */
export function buildLandingAssetPublicUrl(
  storagePath: string,
  cacheVersion?: string | number
): string {
  const base = getPublicSupabaseUrl();
  if (!base) return "";
  const url = `${base}/storage/v1/object/public/${LANDING_ASSETS_BUCKET}/${storagePath}`;
  if (cacheVersion === undefined || cacheVersion === null || cacheVersion === "") {
    return url;
  }
  return `${url}?v=${encodeURIComponent(String(cacheVersion))}`;
}
