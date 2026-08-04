"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleCheckBig, Download } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { IosInstallInstructions, IosInstallButtonLabel } from "@/components/pwa/ios-install-instructions";
import { IOS_PWA_INSTALL_QUERY } from "@/components/pwa/ios-pwa-install-gate";
import { getPwaStartUrl } from "@/lib/pwa/config";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/hooks/use-hydrated";

const MARKETING_INSTALL_PATHS = new Set([
  "/",
  "/about",
  "/pricing",
  "/products",
  "/contact",
  "/partnerships",
]);

type InstallAppButtonProps = {
  className?: string;
  variant?: "hero" | "default";
};

export function InstallAppButton({ className, variant = "default" }: InstallAppButtonProps) {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const router = useRouter();
  const { isInstalled, canInstall, isIOSInstallable, promptInstall } = usePwaInstall();
  const [iosDialogOpen, setIosDialogOpen] = useState(false);
  const pwaStartUrl = getPwaStartUrl();

  // Keep SSR and the hydration pass identical (null) — PWA detection is browser-only.
  if (!hydrated) {
    return null;
  }

  if (isInstalled) {
    return (
      <span
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-7 text-sm font-semibold text-emerald-200",
          className
        )}
        aria-live="polite"
      >
        <CircleCheckBig className="h-4 w-4" aria-hidden />
        App Installed
      </span>
    );
  }

  if (!canInstall && !isIOSInstallable) {
    return null;
  }

  const heroStyles =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/5 px-7 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-white/10";

  const defaultStyles =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-7 text-sm font-semibold text-primary transition-colors hover:bg-primary/10";

  const handleClick = async () => {
    if (isIOSInstallable) {
      // iOS often pins the current URL; leave marketing pages before Add to Home Screen.
      if (MARKETING_INSTALL_PATHS.has(pathname)) {
        router.push(`${pwaStartUrl}?${IOS_PWA_INSTALL_QUERY}=1`);
        return;
      }
      setIosDialogOpen(true);
      return;
    }

    await promptInstall();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(variant === "hero" ? heroStyles : defaultStyles, className)}
      >
        {isIOSInstallable ? (
          <IosInstallButtonLabel />
        ) : (
          <>
            <Download className="h-4 w-4" aria-hidden />
            Install App
          </>
        )}
      </button>

      {isIOSInstallable && (
        <IosInstallInstructions open={iosDialogOpen} onOpenChange={setIosDialogOpen} />
      )}
    </>
  );
}
