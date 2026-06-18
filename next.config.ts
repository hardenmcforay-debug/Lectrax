import type { NextConfig } from "next";
import { getAppSecurityHeaderRoutes } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["exceljs"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async headers() {
    return getAppSecurityHeaderRoutes();
  },
};

export default nextConfig;
