import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingBenefits } from "@/components/landing/landing-benefits";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingUniversityPartnerships } from "@/components/landing/landing-university-partnerships";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingCta } from "@/components/landing/landing-cta";

/** Below-the-fold sections — kept after the hero in the document for priority. */
export function LandingDeferredSections() {
  return (
    <>
      <LandingHowItWorks />
      <LandingBenefits />
      <LandingPricing />
      <LandingUniversityPartnerships />
      <LandingFaq />
      <LandingCta />
    </>
  );
}
