import { APP_NAME } from "@/lib/constants";
import { isAdminDeployment } from "@/lib/auth/admin-deployment";

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

export const PWA_MANIFEST_PATH = "/manifest.json";
export const PWA_SERVICE_WORKER_PATH = "/sw.js";

/** Bump to force browsers/WebAPKs to re-fetch icons + manifest (scope / link-handling). */
export const PWA_ICON_ASSET_VERSION = "20260808pwa";

export function pwaIconUrl(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${PWA_ICON_ASSET_VERSION}`;
}
