import { redirect } from "next/navigation";
import { LoginFailedBanner } from "@/components/auth/login-failed-banner";
import { LandingPage } from "@/components/landing/landing-page";
import { AuthLaunchGate } from "@/components/pwa/auth-launch-gate";
import { getAuthenticatedHomeRedirect } from "@/lib/auth/resolve-authenticated-home";
import { getLandingHeroImageUrl } from "@/lib/landing/hero-image";
import "./landing.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const dashboardPath = await getAuthenticatedHomeRedirect();
  if (dashboardPath) {
    redirect(dashboardPath);
  }

  let heroImageUrl: string | null = null;
  try {
    heroImageUrl = await getLandingHeroImageUrl();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[HomePage] Failed to load hero image:", error);
    }
  }

  return (
    <AuthLaunchGate>
      <LoginFailedBanner />
      <LandingPage heroImageUrl={heroImageUrl} />
    </AuthLaunchGate>
  );
}
