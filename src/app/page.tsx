import { redirect } from "next/navigation";
import { LoginFailedBanner } from "@/components/auth/login-failed-banner";
import { LandingPage } from "@/components/landing/landing-page";
import { AuthLaunchGate } from "@/components/pwa/auth-launch-gate";
import { getAuthenticatedHomeRedirect } from "@/lib/auth/resolve-authenticated-home";
import { getLandingHeroImageUrl } from "@/lib/landing/hero-image";
import { getLandingFeatureCardImageUrls } from "@/lib/landing/site-branding";
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
  const dashboardPath = await getAuthenticatedHomeRedirect();
  if (dashboardPath) {
    redirect(dashboardPath);
  }

  const params = await searchParams;
  const showLoginFailed =
    readParam(params.login_failed) === "1" || readParam(params.error) === "auth";

  let heroImageUrl: string | null = null;
  let featureImages: Record<string, string> = {};
  try {
    [heroImageUrl, featureImages] = await Promise.all([
      getLandingHeroImageUrl(),
      getLandingFeatureCardImageUrls(),
    ]);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[HomePage] Failed to load hero image:", error);
    }
  }

  return (
    <AuthLaunchGate>
      <LoginFailedBanner show={showLoginFailed} />
      <LandingPage heroImageUrl={heroImageUrl} featureImages={featureImages} />
    </AuthLaunchGate>
  );
}
