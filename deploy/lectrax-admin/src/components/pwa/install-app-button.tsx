"use client";

import { useState } from "react";
import { CheckCircle2, Download } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { IosInstallInstructions, IosInstallButtonLabel } from "@/components/pwa/ios-install-instructions";
import { cn } from "@/lib/utils";

type InstallAppButtonProps = {
  className?: string;
  variant?: "hero" | "default";
};

export function InstallAppButton({ className, variant = "default" }: InstallAppButtonProps) {
  const { isInstalled, canInstall, isIOSInstallable, promptInstall } = usePwaInstall();
  const [iosDialogOpen, setIosDialogOpen] = useState(false);

  if (isInstalled) {
    return (
      <span
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-7 text-sm font-semibold text-emerald-200",
          className
        )}
        aria-live="polite"
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden />
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
      setIosDialogOpen(true);
      return;
    }

    await promptInstall();
  };

  return (
    <>
      <button type="button" onClick={handleClick} className={cn(variant === "hero" ? heroStyles : defaultStyles, className)}>
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
