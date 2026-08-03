import { LandingNav } from "@/components/landing/landing-nav";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingDeferredSections } from "@/components/landing/landing-deferred-sections";
import type { FeatureCardId } from "@/lib/landing/feature-cards";

type LandingPageProps = {
  heroImageUrl?: string | null;
  featureImages?: Partial<Record<FeatureCardId, string>>;
};

export function LandingPage({
  heroImageUrl = null,
  featureImages = {},
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNav />
      <main>
        <LandingHero heroImageUrl={heroImageUrl} />
        <LandingFeatures featureImages={featureImages} />
        <LandingDeferredSections />
      </main>
      <LandingFooter />
    </div>
  );
}
