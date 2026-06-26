import { BRAND } from "@/lib/constants";

export const PWA_THEME_COLOR = BRAND.primary;
export const PWA_BACKGROUND_COLOR = BRAND.white;

/** Persisted when the user installs the PWA or we detect standalone mode. */
export const PWA_INSTALLED_STORAGE_KEY = "lectrax-pwa-installed";

function matchesInstalledDisplayMode(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches
    );
  } catch {
    return false;
  }
}

export function markPwaInstalled(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, "1");
  } catch {
    // localStorage may be unavailable in private mode.
  }
}

export function wasPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(PWA_INSTALLED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;

  const standalone =
    matchesInstalledDisplayMode() ||
    // iOS Safari home-screen apps
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true) ||
    wasPwaInstalled();

  if (standalone) {
    markPwaInstalled();
  }

  return standalone;
}

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isMobileDevice(): boolean {
  return isIOSDevice() || isAndroidDevice();
}

export function canUseNativeInstallPrompt(): boolean {
  if (typeof window === "undefined") return false;
  return !isIOSDevice() && !isStandaloneMode();
}

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function isBeforeInstallPromptEvent(event: Event): event is BeforeInstallPromptEvent {
  return "prompt" in event && typeof (event as BeforeInstallPromptEvent).prompt === "function";
}
