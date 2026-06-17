"use client";

import { useCallback, useEffect, useState } from "react";
import {
  canUseNativeInstallPrompt,
  isBeforeInstallPromptEvent,
  isIOSDevice,
  isStandaloneMode,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/detect";

type PwaInstallState = {
  isInstalled: boolean;
  isIOS: boolean;
  canInstall: boolean;
  isIOSInstallable: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());
    setIsIOS(isIOSDevice());

    const handleBeforeInstallPrompt = (event: Event) => {
      if (!isBeforeInstallPromptEvent(event)) return;
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleDisplayModeChange = () => {
      setIsInstalled(isStandaloneMode());
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.matchMedia("(display-mode: standalone)").addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.matchMedia("(display-mode: standalone)").removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable";

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome;
  }, [deferredPrompt]);

  const canInstall = !isInstalled && !!deferredPrompt && canUseNativeInstallPrompt();
  const isIOSInstallable = !isInstalled && isIOS && !isStandaloneMode();

  return {
    isInstalled,
    isIOS,
    canInstall,
    isIOSInstallable,
    promptInstall,
  };
}
