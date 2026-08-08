"use client";

import { useEffect, useState } from "react";
import { IosInstallInstructions } from "@/components/pwa/ios-install-instructions";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export const IOS_PWA_INSTALL_QUERY = "pwa_install";

/**
 * Opens the iOS Add-to-Home-Screen guide when landed on the app entry URL
 * with `?pwa_install=1` (e.g. after Install App on the marketing site).
 */
export function IosPwaInstallGate() {
  const hydrated = useHydrated();
  const { isInstalled, isIOSInstallable } = usePwaInstall();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hydrated || isInstalled || !isIOSInstallable || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get(IOS_PWA_INSTALL_QUERY) !== "1") return;

    setOpen(true);
    params.delete(IOS_PWA_INSTALL_QUERY);
    const next = params.toString();
    const cleanUrl = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", cleanUrl);
  }, [hydrated, isInstalled, isIOSInstallable]);

  if (!hydrated || isInstalled || !isIOSInstallable) {
    return null;
  }

  return <IosInstallInstructions open={open} onOpenChange={setOpen} />;
}
