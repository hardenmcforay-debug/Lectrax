import type { NextConfig } from "next";
import { getAppSecurityHeaderRoutes } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["exceljs"],
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
