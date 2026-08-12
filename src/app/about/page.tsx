import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { AboutPageContent } from "@/components/about/about-page-content";
import { APP_DESCRIPTION } from "@/lib/constants";
import { publicPageMetadata } from "@/lib/seo/metadata";
import "../landing.css";

export const metadata: Metadata = publicPageMetadata({
  title: "About Us",
  description: APP_DESCRIPTION,
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNav />
      <main>
        <AboutPageContent />
      </main>
      <LandingFooter />
    </div>
  );
}
