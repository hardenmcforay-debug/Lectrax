import { createPublicReadClient } from "@/lib/supabase/server";
import { LANDING_FEATURE_CARDS } from "@/lib/landing/feature-cards";
import { buildLandingAssetPublicUrl } from "@/lib/landing/public-asset-url";

export {
  BRANDING_IMAGE_MAX_BYTES,
  isAllowedBrandingImage,
  validateBrandingImageFile,
} from "@/lib/landing/branding-image-validation";

export { LANDING_ASSETS_BUCKET, buildLandingAssetPublicUrl } from "@/lib/landing/public-asset-url";
export const BRANDING_ASSET_CACHE_CONTROL = "max-age=0, must-revalidate";
/** Versioned storage paths (timestamp in filename) — safe for long-lived browser/CDN cache. */
export const VERSIONED_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";
export const HERO_IMAGE_SETTING_KEY = "hero_image";
export const SITE_LOGO_SETTING_KEY = "site_logo";
export const LANDING_FEATURE_CARDS_SETTING_KEY = "landing_feature_cards";

export type BrandingImageSetting = {
  storage_path: string;
  updated_at?: string;
};

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

export function buildHeroImageStoragePath(ext: string, version: string | number = Date.now()): string {
  return `hero/${version}.${ext}`;
}

export function buildSiteLogoStoragePath(ext: string, version: string | number = Date.now()): string {
  return `brand/${version}.${ext}`;
}

export function buildFeatureCardStoragePath(
  cardId: string,
  ext: string,
  version: string | number = Date.now()
): string {
  return `features/${cardId}/${version}.${ext}`;
}

export type LandingFeatureCardsSetting = {
  cards: Record<string, BrandingImageSetting>;
};

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
    updated_at: value.updated_at ?? (data.updated_at as string | undefined),
  };
}

export async function getLandingHeroImageUrl(): Promise<string | null> {
  const setting = await getBrandingSetting(HERO_IMAGE_SETTING_KEY);
  if (!setting?.storage_path) return null;
  return buildLandingAssetPublicUrl(setting.storage_path, setting.updated_at);
}

export async function getLandingHeroImageSetting(): Promise<BrandingImageSetting | null> {
  return getBrandingSetting(HERO_IMAGE_SETTING_KEY);
}

export async function getSiteLogoUrl(): Promise<string | null> {
  const setting = await getBrandingSetting(SITE_LOGO_SETTING_KEY);
  if (!setting?.storage_path) return null;
  return buildLandingAssetPublicUrl(setting.storage_path, setting.updated_at);
}

export async function getSiteLogoSetting(): Promise<BrandingImageSetting | null> {
  return getBrandingSetting(SITE_LOGO_SETTING_KEY);
}

export async function getLandingFeatureCardsSetting(): Promise<Record<string, BrandingImageSetting>> {
  const supabase = await createPublicReadClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", LANDING_FEATURE_CARDS_SETTING_KEY)
    .maybeSingle();

  if (error || !data?.value) return {};

  const value = data.value as LandingFeatureCardsSetting;
  return value.cards ?? {};
}

export async function getLandingFeatureCardImageUrls(): Promise<Record<string, string>> {
  const cards = await getLandingFeatureCardsSetting();
  const imageUrls: Record<string, string> = {};

  for (const feature of LANDING_FEATURE_CARDS) {
    const setting = cards[feature.id];
    imageUrls[feature.id] = setting?.storage_path
      ? buildLandingAssetPublicUrl(setting.storage_path, setting.updated_at)
      : feature.defaultImage;
  }

  return imageUrls;
}

export async function getSiteBranding() {
  const [logoUrl, heroImageUrl] = await Promise.all([
    getSiteLogoUrl(),
    getLandingHeroImageUrl(),
  ]);

  return { logoUrl, heroImageUrl };
}
