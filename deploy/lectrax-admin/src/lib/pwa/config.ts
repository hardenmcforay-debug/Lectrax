import { APP_NAME } from "@/lib/constants";
import { isAdminDeployment } from "@/lib/auth/admin-deployment";

export function getPwaAppName(): string {
  return isAdminDeployment() ? `${APP_NAME} Admin` : APP_NAME;
}

export function getPwaShortName(): string {
  return isAdminDeployment() ? "Lectrax Admin" : APP_NAME;
}

/** Installed PWA entry — auth/app shell, never the marketing landing page. */
export function getPwaStartUrl(): string {
  return isAdminDeployment() ? "/admin" : "/login";
}

export const PWA_MANIFEST_PATH = "/manifest.json";
export const PWA_SERVICE_WORKER_PATH = "/sw.js";

/** Bump when regenerating icons (`npm run sync-icons-from-site-logo` / generate:pwa-icons). */
export const PWA_ICON_ASSET_VERSION = "20260803b";

export function pwaIconUrl(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${PWA_ICON_ASSET_VERSION}`;
}
