import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthBackToLanding } from "@/components/auth/auth-back-to-landing";
import { IosPwaInstallGate } from "@/components/pwa/ios-pwa-install-gate";
import { NOINDEX_METADATA } from "@/lib/seo/metadata";

export const metadata: Metadata = NOINDEX_METADATA;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-route-root">
      <AuthBackToLanding />
      <IosPwaInstallGate />
      {children}
    </div>
  );
}
