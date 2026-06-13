import { createPublicReadClient } from "@/lib/supabase/server";

export const LANDING_ASSETS_BUCKET = "landing-assets";
export const HERO_IMAGE_SETTING_KEY = "hero_image";
export const SITE_LOGO_SETTING_KEY = "site_logo";
export const BRANDING_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export type BrandingImageSetting = {
  storage_path: string;
  updated_at?: string;
};

export function buildLandingAssetPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/storage/v1/object/public/${LANDING_ASSETS_BUCKET}/${storagePath}`;
}

export function extensionForImageMime(mime: string): string | null {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return null;
  }
}

export function isAllowedBrandingImage(file: { type: string; size: number }): boolean {
  return (
    ALLOWED_IMAGE_TYPES.has(file.type) &&
    file.size > 0 &&
    file.size <= BRANDING_IMAGE_MAX_BYTES
  );
}

export function buildHeroImageStoragePath(ext: string): string {
  return `hero/landing.${ext}`;
}

export function buildSiteLogoStoragePath(ext: string): string {
  return `brand/logo.${ext}`;
}

async function getBrandingSetting(key: string): Promise<BrandingImageSetting | null> {
  const supabase = await createPublicReadClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle();

  if (error || !data?.value) return null;

  const value = data.value as BrandingImageSetting;
  if (!value.storage_path) return null;

  return {
    storage_path: value.storage_path,
    updated_at: data.updated_at as string | undefined,
  };
}

export async function getLandingHeroImageUrl(): Promise<string | null> {
  const setting = await getBrandingSetting(HERO_IMAGE_SETTING_KEY);
  if (!setting?.storage_path) return null;
  return buildLandingAssetPublicUrl(setting.storage_path);
}

export async function getLandingHeroImageSetting(): Promise<BrandingImageSetting | null> {
  return getBrandingSetting(HERO_IMAGE_SETTING_KEY);
}

export async function getSiteLogoUrl(): Promise<string | null> {
  const setting = await getBrandingSetting(SITE_LOGO_SETTING_KEY);
  if (!setting?.storage_path) return null;
  return buildLandingAssetPublicUrl(setting.storage_path);
}

export async function getSiteLogoSetting(): Promise<BrandingImageSetting | null> {
  return getBrandingSetting(SITE_LOGO_SETTING_KEY);
}

export async function getSiteBranding() {
  const [logoUrl, heroImageUrl] = await Promise.all([
    getSiteLogoUrl(),
    getLandingHeroImageUrl(),
  ]);

  return { logoUrl, heroImageUrl };
}
