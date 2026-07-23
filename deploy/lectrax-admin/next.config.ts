import type { NextConfig } from "next";
import { getAdminSecurityHeaderRoutes } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return getAdminSecurityHeaderRoutes();
  },
};

export default nextConfig;
