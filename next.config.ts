import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { getAppSecurityHeaderRoutes } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // Public browser maps stay off; Sentry uploads private maps when auth token is set.
  productionBrowserSourceMaps: false,
  // Don't auto-generate AGENTS.md / CLAUDE.md into the repo on `next dev`.
  agentRules: false,
  serverExternalPackages: ["exceljs"],
  // Allow HMR when opening the dev server from LAN IPs (phone / other device).
  allowedDevOrigins: ["192.168.1.187", "192.168.1.188", "192.168.1.192", "10.126.4.188"],
  // @hookform/resolvers exports `./zod` → zod.mjs, but the published package
  // only ships zod.module.js / zod.js. Point Turbopack at the real ESM file.
  turbopack: {
    resolveAlias: {
      "@hookform/resolvers/zod": "./node_modules/@hookform/resolvers/zod/dist/zod.js",
      "@hookform/resolvers": "./node_modules/@hookform/resolvers/dist/resolvers.js",
    },
  },
  experimental: {
    // Next 16.3: persist Turbopack cache to disk, then evict in-memory copies.
    // Required on ~8GB machines — without this, `next dev` grows past 1.5GB
    // and thrash-locks Windows. First compile may be slow on HDD; warm runs
    // stay usable. Override with `npm run dev:webpack` if needed.
    turbopackFileSystemCacheForDev: true,
    turbopackMemoryEviction: "full",
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
