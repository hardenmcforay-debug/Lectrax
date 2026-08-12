import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * Public marketing site is crawlable; authenticated app surfaces are disallowed.
 * Static assets / Next.js bundles are not blocked so public pages can render.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/lecturer",
          "/lecturer/",
          "/student",
          "/student/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/go",
          "/go/",
          "/api/",
          "/auth/",
          "/offline",
          "/payments/",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: "lectrax.com",
  };
}
