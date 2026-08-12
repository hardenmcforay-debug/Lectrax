import { AccountDeletedBanner } from "@/components/auth/account-deleted-banner";
import { LoginFailedBanner } from "@/components/auth/login-failed-banner";
import { LandingPage } from "@/components/landing/landing-page";
import { AuthLaunchGate } from "@/components/pwa/auth-launch-gate";
import { JsonLd } from "@/components/seo/json-ld";
import { getLandingHeroImageUrl } from "@/lib/landing/hero-image";
import { getLandingFeatureCardImageUrls } from "@/lib/landing/site-branding";
import { buildMarketingStructuredData } from "@/lib/seo/structured-data";
import "./landing.css";

export const dynamic = "force-dynamic";

function readParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const accountDeleted = readParam(params.accountDeleted) === "1";

  const [heroImageUrl, featureImages] = await Promise.all([
    getLandingHeroImageUrl().catch(() => null),
    getLandingFeatureCardImageUrls().catch(() => ({})),
  ]);

  const showLoginFailed =
    readParam(params.login_failed) === "1" || readParam(params.error) === "auth";

  return (
    <AuthLaunchGate>
      <JsonLd data={buildMarketingStructuredData()} />
      <AccountDeletedBanner show={accountDeleted} />
      <LoginFailedBanner show={showLoginFailed && !accountDeleted} />
      <LandingPage heroImageUrl={heroImageUrl} featureImages={featureImages} />
    </AuthLaunchGate>
  );
}
