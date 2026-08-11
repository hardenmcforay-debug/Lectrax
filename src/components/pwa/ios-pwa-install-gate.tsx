"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { IosInstallInstructions } from "@/components/pwa/ios-install-instructions";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export const IOS_PWA_INSTALL_QUERY = "pwa_install";

function subscribeToUrl(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function readInstallQueryFlag(): boolean {
  return new URLSearchParams(window.location.search).get(IOS_PWA_INSTALL_QUERY) === "1";
}

/**
 * Opens the iOS Add-to-Home-Screen guide when landed on the app entry URL
 * with `?pwa_install=1` (e.g. after Install App on the marketing site).
 */
export function IosPwaInstallGate() {
  const hydrated = useHydrated();
  const { isInstalled, isIOSInstallable } = usePwaInstall();
  const queryFlag = useSyncExternalStore(subscribeToUrl, readInstallQueryFlag, () => false);
  const [holdOpen, setHoldOpen] = useState(false);

  // Latch the query flag into state during render (Compiler-safe adjust pattern).
  if (queryFlag && !holdOpen) {
    setHoldOpen(true);
  }

  useEffect(() => {
    if (!holdOpen || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get(IOS_PWA_INSTALL_QUERY) !== "1") return;

    params.delete(IOS_PWA_INSTALL_QUERY);
    const next = params.toString();
    const cleanUrl = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", cleanUrl);
  }, [holdOpen]);

  if (!hydrated || isInstalled || !isIOSInstallable) {
    return null;
  }

  return (
    <IosInstallInstructions
      open={holdOpen}
      onOpenChange={(next) => {
        if (!next) setHoldOpen(false);
      }}
    />
  );
}
