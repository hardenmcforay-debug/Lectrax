"use client";

import dynamic from "next/dynamic";

function HeroVisualPlaceholder() {
  return (
    <div
      className="hero-portal-stage relative mx-auto aspect-[4/3] w-full max-w-[min(100%,32rem)]"
      aria-hidden
    />
  );
}

/**
 * Code-split the heavy Framer Motion hero visual so it does not block
 * parsing/hydration of the LCP heading on the critical path.
 */
const HeroVisual = dynamic(
  () => import("@/components/landing/hero-visual").then((mod) => mod.HeroVisual),
  { ssr: true, loading: () => <HeroVisualPlaceholder /> }
);

export function LandingHeroVisual({ imageUrl }: { imageUrl?: string | null }) {
  return <HeroVisual imageUrl={imageUrl} />;
}
