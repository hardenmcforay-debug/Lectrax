import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { getAppSecurityHeaderRoutes } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // Public browser maps stay off; Sentry uploads private maps when auth token is set.
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["exceljs"],
  // Allow HMR when opening the dev server from LAN IPs (phone / other device).
  allowedDevOrigins: ["192.168.1.187", "10.126.4.188"],
  // @hookform/resolvers exports `./zod` → zod.mjs, but the published package
  // only ships zod.module.js / zod.js. Point Turbopack at the real ESM file.
  turbopack: {
    resolveAlias: {
      "@hookform/resolvers/zod": "./node_modules/@hookform/resolvers/zod/dist/zod.js",
      "@hookform/resolvers": "./node_modules/@hookform/resolvers/dist/resolvers.js",
    },
  },
  experimental: {
    // This machine uses an HDD. Turbopack's persistent FS cache makes large
    // synchronous writes under `.next/dev` (and triggers the "slow filesystem"
    // warning). Disabling it keeps dev in-memory for the session — same app
    // behavior/UI, less disk thrash. Production `next build` is unchanged.
    turbopackFileSystemCacheForDev: false,
    // Match assignment multipart uploads (10 MB PDF + form overhead). The
    // proxy default of 10 MB truncates the body and the scanner then rejects
    // the file as "not a PDF".
    proxyClientMaxBodySize: "12mb",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86_400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return getAppSecurityHeaderRoutes();
  },
};

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const sentryDsn =
  process.env.SENTRY_DSN?.trim() ||
  process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
// Skip the Sentry webpack/turbopack wrapper when unset — on ~8GB machines it
// balloons the Next.js process and makes local `next dev` unusable.
const sentryEnabled = Boolean(sentryAuthToken || sentryDsn);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: sentryAuthToken,
      silent: !sentryAuthToken,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      disableLogger: true,
      automaticVercelMonitors: true,
      sourcemaps: {
        disable: !sentryAuthToken,
        deleteSourcemapsAfterUpload: true,
      },
    })
  : nextConfig;
