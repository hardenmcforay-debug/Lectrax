export {
  LANDING_ASSETS_BUCKET,
  HERO_IMAGE_SETTING_KEY,
  BRANDING_IMAGE_MAX_BYTES as HERO_IMAGE_MAX_BYTES,
  buildLandingAssetPublicUrl,
  extensionForImageMime,
  isAllowedBrandingImage as isAllowedHeroImage,
  buildHeroImageStoragePath,
  getLandingHeroImageUrl,
  getLandingHeroImageSetting,
  type BrandingImageSetting as HeroImageSetting,
} from "@/lib/landing/site-branding";
