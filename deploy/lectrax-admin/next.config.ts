import type { NextConfig } from "next";
import { getAdminSecurityHeaderRoutes } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async headers() {
    return getAdminSecurityHeaderRoutes();
  },
};

export default nextConfig;
