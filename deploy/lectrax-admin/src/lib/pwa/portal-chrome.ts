import { isStandaloneMode } from "@/lib/pwa/detect";

const MOBILE_LAYOUT_MAX_WIDTH = 1023;

/** Synchronous PWA / mobile markers for portal layout CSS (safe in browser only). */
export function applyPortalChromeMarks() {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const root = document.documentElement;

  if (isStandaloneMode()) {
    root.dataset.pwaStandalone = "true";
  }

  if (window.innerWidth <= MOBILE_LAYOUT_MAX_WIDTH) {
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
