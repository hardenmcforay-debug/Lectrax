import { isMobileDevice, isStandaloneMode, markPwaInstalled } from "@/lib/pwa/detect";

const MOBILE_LAYOUT_MAX_WIDTH = 1023;

function isMobileLayoutViewport(): boolean {
  if (typeof window === "undefined") return false;

  if (window.innerWidth <= MOBILE_LAYOUT_MAX_WIDTH) return true;

  try {
    if (window.matchMedia(`(max-width: ${MOBILE_LAYOUT_MAX_WIDTH}px)`).matches) {
      return true;
    }
    if (window.matchMedia("(pointer: coarse)").matches) {
      return true;
    }
    if (window.matchMedia("(any-pointer: coarse)").matches) {
      return true;
    }
  } catch {
    // matchMedia may be unavailable in some embedded browsers.
  }

  // Phones/tablets can report fine pointer + wide viewport in installed PWAs.
  if (isMobileDevice()) return true;

  return false;
}

/** Synchronous PWA / mobile markers for portal layout CSS (safe in browser only). */
export function applyPortalChromeMarks() {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const root = document.documentElement;
  const standalone = isStandaloneMode();
  const mobile = standalone || isMobileLayoutViewport();

  if (standalone) {
    markPwaInstalled();
    if (root.dataset.pwaStandalone !== "true") {
      root.dataset.pwaStandalone = "true";
    }
    if (root.dataset.portalMobile !== "true") {
      root.dataset.portalMobile = "true";
    }
    return;
  }

  if (mobile) {
    if (root.dataset.portalMobile !== "true") {
      root.dataset.portalMobile = "true";
    }
  } else if (root.dataset.portalMobile !== undefined) {
    delete root.dataset.portalMobile;
  }
}

export function isPortalRoutePath(pathname: string): boolean {
  return (
    pathname.startsWith("/student") ||
    pathname.startsWith("/lecturer") ||
    pathname.startsWith("/admin")
  );
}
