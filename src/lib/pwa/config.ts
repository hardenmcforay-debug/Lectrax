import { APP_NAME } from "@/lib/constants";
import { isAdminDeployment } from "@/lib/auth/admin-deployment";
import { isRunningAsInstalledPwa } from "@/lib/pwa/detect";
import { isPwaScopePath, toPwaScopePath } from "@/lib/pwa/scope";

export function getPwaAppName(): string {
  return isAdminDeployment() ? `${APP_NAME} Admin` : APP_NAME;
}

export function getPwaShortName(): string {
  return isAdminDeployment() ? "Lectrax Admin" : APP_NAME;
}

/** Installed PWA entry — under `/go` scope so marketing `/` is never in the app. */
export function getPwaStartUrl(): string {
  return isAdminDeployment() ? "/admin" : "/go/login";
}

/**
 * Client auth entry after logout / session expiry.
 * Keeps installed PWAs inside `/go/*` so logout never flashes the website shell.
 */
export function getClientAuthEntryPath(): string {
  if (typeof window === "undefined" || isAdminDeployment()) {
    return "/login";
  }

  if (isRunningAsInstalledPwa() || isPwaScopePath(window.location.pathname)) {
    return toPwaScopePath("/login");
  }

  return "/login";
}

/** Keep hard navigations inside the installed-app scope when already in PWA/`/go`. */
export function toClientAppPath(pathname: string): string {
  if (typeof window === "undefined" || isAdminDeployment()) {
    return pathname;
  }
  if (!pathname.startsWith("/") || /^https?:\/\//i.test(pathname)) {
    return pathname;
  }
  const [path, query] = pathname.split("?");
  if (isRunningAsInstalledPwa() || isPwaScopePath(window.location.pathname)) {
    const scoped = toPwaScopePath(path || "/login");
    return query ? `${scoped}?${query}` : scoped;
  }
  return pathname;
}

export const PWA_MANIFEST_PATH = "/manifest.json";
export const PWA_SERVICE_WORKER_PATH = "/sw.js";

/** Bump to force browsers/WebAPKs to re-fetch icons + manifest (scope / link-handling). */
export const PWA_ICON_ASSET_VERSION = "20260808pwa";

export function pwaIconUrl(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${PWA_ICON_ASSET_VERSION}`;
}
