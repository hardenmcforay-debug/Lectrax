import { Suspense } from "react";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingDeferredSections } from "@/components/landing/landing-deferred-sections";
import { getLandingHeroImageUrl } from "@/lib/landing/hero-image";
import { getLandingFeatureCardImageUrls } from "@/lib/landing/site-branding";

/**
 * Streams the hero immediately (LCP heading), then loads remote image URLs
 * without blocking first paint.
 */
async function LandingHeroWithImage() {
  let heroImageUrl: string | null = null;
  try {
    heroImageUrl = await getLandingHeroImageUrl();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[LandingHeroWithImage] Failed to load hero image:", error);
    }
  }
  return <LandingHero heroImageUrl={heroImageUrl} />;
}

async function LandingFeaturesWithImages() {
  let featureImages: Record<string, string> = {};
  try {
    featureImages = await getLandingFeatureCardImageUrls();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[LandingFeaturesWithImages] Failed to load feature images:", error);
    }
  }
  return <LandingFeatures featureImages={featureImages} />;
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNav />
      <main>
        <Suspense fallback={<LandingHero heroImageUrl={null} />}>
          <LandingHeroWithImage />
        </Suspense>

        <Suspense fallback={<LandingFeatures featureImages={{}} />}>
          <LandingFeaturesWithImages />
        </Suspense>

        <LandingDeferredSections />
      </main>
      <LandingFooter />
    </div>
  );
}
