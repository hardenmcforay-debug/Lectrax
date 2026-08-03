"use client";

import { HeroVisual } from "@/components/landing/hero-visual";

/**
 * Hero visual stays in the main client graph so the photo can SSR into HTML
 * immediately (no dynamic() placeholder delay before the image mounts).
 */
export function LandingHeroVisual({ imageUrl }: { imageUrl?: string | null }) {
  return <HeroVisual imageUrl={imageUrl} />;
}
