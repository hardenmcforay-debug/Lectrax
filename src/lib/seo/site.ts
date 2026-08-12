/**
 * Canonical production origin for SEO (metadata, sitemap, robots, Open Graph).
 * Prefer the live primary host — never localhost or preview URLs.
 */
export const CANONICAL_SITE_ORIGIN = "https://www.lectrax.com";

/** Existing Lectrax brand mark used for Open Graph / schema logo. */
export const DEFAULT_OG_IMAGE_PATH = "/brand/official-logo.png";

export function getCanonicalSiteOrigin(): string {
  return CANONICAL_SITE_ORIGIN;
}

/** Absolute URL for a site path (leading slash optional). */
export function absoluteUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") {
    return `${CANONICAL_SITE_ORIGIN}/`;
  }
  return `${CANONICAL_SITE_ORIGIN}${normalized}`;
}
