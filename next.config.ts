import type { NextConfig } from "next";
import { getAppSecurityHeaderRoutes } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
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

export default nextConfig;