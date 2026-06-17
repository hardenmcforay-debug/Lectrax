import { isStandaloneMode } from "@/lib/pwa/detect";

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
  } catch {
    // matchMedia may be unavailable in some embedded browsers.
  }

  return false;
}

/** Synchronous PWA / mobile markers for portal layout CSS (safe in browser only). */
export function applyPortalChromeMarks() {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const root = document.documentElement;
  const standalone = isStandaloneMode();

  if (standalone) {
    root.dataset.pwaStandalone = "true";
    // Installed PWAs always use mobile chrome, including tablet widths.
    root.dataset.portalMobile = "true";
  } else if (isMobileLayoutViewport()) {
    root.dataset.portalMobile = "true";
  } else {
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
