import Link from "next/link";
import { APP_TAGLINE } from "@/lib/constants";
import { LandingHeroVisual } from "@/components/landing/landing-hero-visual";
import { LandingHeroInstallButton } from "@/components/landing/landing-hero-install-button";
import { LandingHeroFeatureHighlights } from "@/components/landing/landing-hero-feature-highlights";

function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="hero-gradient absolute inset-0" />
      <div className="hero-grid absolute inset-0 opacity-40" />
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-blue-400/15 blur-3xl" />
      <div className="absolute bottom-1/4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
    </div>
  );
}

function HeroWave() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 leading-[0]" aria-hidden>
      <svg
        className="block w-full translate-y-px"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0,64 C360,120 720,0 1080,48 C1260,72 1380,96 1440,80 L1440,120 L0,120 Z"
          fill="white"
        />
      </svg>
    </div>
  );
}

type LandingHeroProps = {
  heroImageUrl?: string | null;
};

/**
 * Server-rendered hero — LCP heading is plain HTML (no opacity/transform animation)
 * so it can paint in the first frame without waiting for Framer Motion or hydration.
 */
export function LandingHero({ heroImageUrl }: LandingHeroProps) {
  return (
    <section className="hero-section relative flex min-h-screen flex-col overflow-hidden">
      {heroImageUrl ? (
        <link
          rel="preload"
          as="image"
          href={heroImageUrl}
          media="(min-width: 1024px)"
          fetchPriority="high"
        />
      ) : null}

      <HeroBackground />

      <div className="landing-hero-safe relative z-[1] mx-auto flex w-full max-w-7xl flex-1 items-center px-4 pb-24 sm:px-6 sm:pb-28 lg:px-8 lg:pb-24">
        <div className="grid w-full items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="order-1 hidden lg:block lg:order-none">
            <LandingHeroVisual imageUrl={heroImageUrl} />
          </div>

          <div className="order-2 text-center lg:text-left">
            <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
              {APP_TAGLINE}
            </h1>

            <p className="mx-auto mt-4 max-w-[600px] text-sm leading-relaxed text-blue-100/90 sm:text-base lg:mx-0">
              Empower lecturers with a centralized platform for attendance tracking, assignments,
              continuous assessment, and student performance management.
            </p>

            <LandingHeroFeatureHighlights />

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:mt-9 lg:justify-start">
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-7 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 active:scale-[0.98]"
              >
                Get Started
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/40 bg-white/5 px-7 text-sm font-semibold text-white backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/10 active:scale-[0.98]"
              >
                Contact Us
              </Link>
              <LandingHeroInstallButton />
            </div>
          </div>
        </div>
      </div>

      <HeroWave />
    </section>
  );
}
