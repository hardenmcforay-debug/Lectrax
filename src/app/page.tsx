import { LoginFailedBanner } from "@/components/auth/login-failed-banner";
import { LandingPage } from "@/components/landing/landing-page";
import { getLandingHeroImageUrl } from "@/lib/landing/hero-image";
import "./landing.css";

export const revalidate = 60;

export default async function HomePage() {
  const heroImageUrl = await getLandingHeroImageUrl();

  return (
    <>
      <LoginFailedBanner />
      <LandingPage heroImageUrl={heroImageUrl} />
    </>
  );
}
