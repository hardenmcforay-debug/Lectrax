"use client";

import dynamic from "next/dynamic";

/** PWA install UI is browser-only — keep it out of the hero critical path. */
const InstallAppButton = dynamic(
  () =>
    import("@/components/pwa/install-app-button").then((mod) => mod.InstallAppButton),
  { ssr: false, loading: () => null }
);

export function LandingHeroInstallButton() {
  return <InstallAppButton variant="hero" />;
}
