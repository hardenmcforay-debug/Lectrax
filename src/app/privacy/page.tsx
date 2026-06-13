import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PrivacyPolicyContent } from "@/components/legal/privacy-policy-content";
import { APP_NAME } from "@/lib/constants";
import "../landing.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Learn how ${APP_NAME} collects, uses, and protects your personal and academic information.`,
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNav />
      <main>
        <PrivacyPolicyContent />
      </main>
      <LandingFooter />
    </div>
  );
}
