import { LandingNav } from "@/components/landing/landing-nav";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingBenefits } from "@/components/landing/landing-benefits";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingUniversityPartnerships } from "@/components/landing/landing-university-partnerships";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingCta } from "@/components/landing/landing-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

type LandingPageProps = {
  heroImageUrl?: string | null;
};

export function LandingPage({ heroImageUrl }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNav />
      <main>
        <LandingHero heroImageUrl={heroImageUrl} />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingBenefits />
        <LandingPricing />
        <LandingUniversityPartnerships />
        <LandingFaq />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
