import { APP_NAME } from "@/lib/constants";
import { isAdminDeployment } from "@/lib/auth/admin-deployment";

export function getPwaAppName(): string {
  return isAdminDeployment() ? `${APP_NAME} Admin` : APP_NAME;
}

export function getPwaShortName(): string {
  return isAdminDeployment() ? "Lectrax Admin" : APP_NAME;
}

export function getPwaStartUrl(): string {
  return isAdminDeployment() ? "/admin" : "/";
}

export const PWA_MANIFEST_PATH = "/manifest.json";
export const PWA_SERVICE_WORKER_PATH = "/sw.js";
