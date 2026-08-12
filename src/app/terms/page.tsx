import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { TermsOfServiceContent } from "@/components/legal/terms-of-service-content";
import { APP_NAME } from "@/lib/constants";
import { publicPageMetadata } from "@/lib/seo/metadata";
import "../landing.css";

export const metadata: Metadata = publicPageMetadata({
  title: "Terms of Service",
  description: `Read the Terms of Service governing your use of the ${APP_NAME} academic management platform.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNav />
      <main>
        <TermsOfServiceContent />
      </main>
      <LandingFooter />
    </div>
  );
}
