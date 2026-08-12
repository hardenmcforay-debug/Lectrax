import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { CookiePolicyContent } from "@/components/legal/cookie-policy-content";
import { APP_NAME } from "@/lib/constants";
import { publicPageMetadata } from "@/lib/seo/metadata";
import "../landing.css";

export const metadata: Metadata = publicPageMetadata({
  title: "Cookie Policy",
  description: `Learn how ${APP_NAME} uses cookies and similar technologies on the academic management platform.`,
  path: "/cookies",
});

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNav />
      <main>
        <CookiePolicyContent />
      </main>
      <LandingFooter />
    </div>
  );
}
