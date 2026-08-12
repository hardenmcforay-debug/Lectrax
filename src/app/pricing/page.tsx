import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PricingPageContent } from "@/components/pricing/pricing-page-content";
import { getPaymentMethodLogoUrls } from "@/lib/subscription/payment-method-logos";
import { publicPageMetadata } from "@/lib/seo/metadata";
import "../landing.css";

export const metadata: Metadata = publicPageMetadata({
  title: "Pricing",
  description:
    "Lectrax pricing for lecturer subscriptions and university partnerships, including how payments work with Orange Money and Afrimoney via Monime.",
  path: "/pricing",
});

export default async function PricingPage() {
  const paymentMethodLogos = await getPaymentMethodLogoUrls();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNav />
      <main>
        <PricingPageContent paymentMethodLogos={paymentMethodLogos} />
      </main>
      <LandingFooter />
    </div>
  );
}
