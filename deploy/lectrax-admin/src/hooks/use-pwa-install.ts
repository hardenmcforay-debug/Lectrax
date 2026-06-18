"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  canUseNativeInstallPrompt,
  isBeforeInstallPromptEvent,
  isIOSDevice,
  isStandaloneMode,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/detect";
import { PWA_INSTALL_PROMPT_READY_EVENT } from "@/lib/pwa/install-prompt-bootstrap";

type PwaInstallState = {
  isInstalled: boolean;
  isIOS: boolean;
  canInstall: boolean;
  isIOSInstallable: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

type InstallSnapshot = {
  isInstalled: boolean;
  isIOS: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
};

declare global {
  interface Window {
    __lectraxDeferredInstallPrompt?: Event | null;
    __lectraxPwaInstallListenersBound?: boolean;
  }
}

const SERVER_SNAPSHOT: InstallSnapshot = {
  isInstalled: false,
  isIOS: false,
  deferredPrompt: null,
};

let cachedClientSnapshot: InstallSnapshot | null = null;

function readDeferredPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === "undefined") return null;

  const event = window.__lectraxDeferredInstallPrompt;
  return event && isBeforeInstallPromptEvent(event) ? event : null;
}

function getClientSnapshot(): InstallSnapshot {
  const next: InstallSnapshot = {
    isInstalled: isStandaloneMode(),
    isIOS: isIOSDevice(),
    deferredPrompt: readDeferredPrompt(),
  };

  if (
    cachedClientSnapshot &&
    cachedClientSnapshot.isInstalled === next.isInstalled &&
    cachedClientSnapshot.isIOS === next.isIOS &&
    cachedClientSnapshot.deferredPrompt === next.deferredPrompt
  ) {
    return cachedClientSnapshot;
  }

  cachedClientSnapshot = next;
  return cachedClientSnapshot;
}

function invalidateClientSnapshot() {
  cachedClientSnapshot = null;
}

function subscribeToInstallPrompt(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleChange = () => {
    invalidateClientSnapshot();
    onStoreChange();
  };

  window.addEventListener(PWA_INSTALL_PROMPT_READY_EVENT, handleChange);
  window.addEventListener("appinstalled", handleChange);
  window.matchMedia("(display-mode: standalone)").addEventListener("change", handleChange);
  window.matchMedia("(display-mode: fullscreen)").addEventListener("change", handleChange);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) handleChange();
  });

  return () => {
    window.removeEventListener(PWA_INSTALL_PROMPT_READY_EVENT, handleChange);
    window.removeEventListener("appinstalled", handleChange);
    window.matchMedia("(display-mode: standalone)").removeEventListener("change", handleChange);
    window.matchMedia("(display-mode: fullscreen)").removeEventListener("change", handleChange);
  };
}

export function usePwaInstall(): PwaInstallState {
  const snapshot = useSyncExternalStore(
    subscribeToInstallPrompt,
    getClientSnapshot,
    () => SERVER_SNAPSHOT
  );

  const promptInstall = useCallback(async () => {
    const deferredPrompt = readDeferredPrompt();
    if (!deferredPrompt) return "unavailable";

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    window.__lectraxDeferredInstallPrompt = null;
    invalidateClientSnapshot();
    window.dispatchEvent(new Event(PWA_INSTALL_PROMPT_READY_EVENT));
    return outcome;
  }, []);

  const canInstall =
    !snapshot.isInstalled && !!snapshot.deferredPrompt && canUseNativeInstallPrompt();
  const isIOSInstallable = !snapshot.isInstalled && snapshot.isIOS && !isStandaloneMode();

  return {
    isInstalled: snapshot.isInstalled,
    isIOS: snapshot.isIOS,
    canInstall,
    isIOSInstallable,
    promptInstall,
  };
}
