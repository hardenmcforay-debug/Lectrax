import type { MetadataRoute } from "next";
import { PRODUCT_SLUGS } from "@/lib/landing/products";
import { absoluteUrl } from "@/lib/seo/site";

const PUBLIC_STATIC_PATHS = [
  "/",
  "/about",
  "/pricing",
  "/partnerships",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
] as const;

/** Public marketing URLs only — never include auth or portal routes. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/pricing" || path === "/about" ? 0.8 : 0.6,
  }));

  const productEntries: MetadataRoute.Sitemap = PRODUCT_SLUGS.map((slug) => ({
    url: absoluteUrl(`/products/${slug}`),
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...productEntries];
}
