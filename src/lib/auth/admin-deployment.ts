import type { UserRole } from "@/types/database";
import { ROLE_ROUTES } from "@/lib/constants";
import {
  DEV_ADMIN_HTTP_ORIGIN,
  normalizeSecureOrigin,
} from "@/lib/security/transport";

function normalizeOrigin(url: string): string {
  return normalizeSecureOrigin(url.replace(/\/$/, ""));
}

/** External admin app origin when platform admin is deployed separately (e.g. https://admin.lectrax.app). */
export function getAdminAppUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_ADMIN_APP_URL?.trim();
  return configured ? normalizeOrigin(configured) : null;
}

/** Main lecturer/student app origin (e.g. https://lectrax.app). */
export function getMainAppUrl(fallbackOrigin?: string): string | null {
  const configured = process.env.NEXT_PUBLIC_MAIN_APP_URL?.trim();
  if (configured) return normalizeOrigin(configured);
  if (fallbackOrigin) return normalizeOrigin(fallbackOrigin);
  return null;
}

export function isAdminHostedSeparately(): boolean {
  return Boolean(getAdminAppUrl());
}

/** True when this deployment is the dedicated platform-admin app. */
export function isAdminDeployment(): boolean {
  return process.env.NEXT_PUBLIC_DEPLOYMENT_TARGET?.trim() === "admin";
}

export function getRoleHomePath(role: UserRole): string {
  return ROLE_ROUTES[role] ?? ROLE_ROUTES.student;
}

/**
 * Dashboard URL for a role. Returns an absolute URL when the role's portal
 * lives on a different deployment origin.
 */
export function getRoleHomeUrl(role: UserRole, fallbackOrigin?: string): string {
  if (role === "platform_admin") {
    const adminUrl = getAdminAppUrl();
    if (adminUrl) {
      return `${adminUrl}${ROLE_ROUTES.platform_admin}`;
    }
    if (isAdminDeployment()) {
      const origin =
        fallbackOrigin ??
        process.env.NEXT_PUBLIC_APP_URL ??
        (process.env.NODE_ENV === "production" ? "" : DEV_ADMIN_HTTP_ORIGIN);
      if (!origin) {
        return ROLE_ROUTES.platform_admin;
      }
      return `${normalizeOrigin(origin)}${ROLE_ROUTES.platform_admin}`;
    }
  }

  if (isAdminDeployment() && role !== "platform_admin") {
    const mainUrl = getMainAppUrl(fallbackOrigin);
    if (mainUrl) {
      return `${mainUrl}${getRoleHomePath(role)}`;
    }
  }

  if (isAdminHostedSeparately() && role === "platform_admin") {
    const adminUrl = getAdminAppUrl();
    if (adminUrl) {
      return `${adminUrl}${ROLE_ROUTES.platform_admin}`;
    }
  }

  return getRoleHomePath(role);
}

export function getAdminLoginUrl(fallbackOrigin?: string): string {
  const adminUrl = getAdminAppUrl();
  if (adminUrl) {
    return `${adminUrl}/login`;
  }
  if (isAdminDeployment()) {
    const origin =
      fallbackOrigin ??
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.NODE_ENV === "production" ? "" : DEV_ADMIN_HTTP_ORIGIN);
    if (!origin) {
      return "/login";
    }
    return `${normalizeOrigin(origin)}/login`;
  }
  return "/login";
}

export function getMainLoginUrl(fallbackOrigin?: string): string {
  const mainUrl = getMainAppUrl(fallbackOrigin);
  if (mainUrl) {
    return `${mainUrl}/login`;
  }
  return "/login";
}

export function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** True when a URL is absolute and uses HTTPS (required for production cross-origin redirects). */
export function isSecureAbsoluteUrl(value: string): boolean {
  return /^https:\/\//i.test(value);
}

export const PLATFORM_ADMIN_MAIN_APP_LOGIN_ERROR = "admin";

/** True on the lecturer/student deployment (not the dedicated admin app). */
export function isMainAppDeployment(): boolean {
  return !isAdminDeployment();
}

export function getPlatformAdminMainAppLoginDeniedMessage(): string {
  const adminLogin = getAdminLoginUrl();
  if (isAbsoluteUrl(adminLogin)) {
    return "Platform administrators must sign in through the admin portal. Lecturers and students use this page.";
  }
  return "Platform administrators cannot sign in here. Please use the admin portal.";
}

/** Redirect target when a platform admin must not use the main app login/session. */
export function getPlatformAdminLoginRedirectUrl(origin: string): string {
  const adminLogin = getAdminLoginUrl(origin);
  if (isAbsoluteUrl(adminLogin)) {
    return adminLogin;
  }
  const url = new URL("/login", origin);
  url.searchParams.set("error", PLATFORM_ADMIN_MAIN_APP_LOGIN_ERROR);
  return url.toString();
}

export function redirectToRoleHome(role: UserRole, redirectParam?: string | null) {
  const home = getRoleHomeUrl(role);
  if (redirectParam && redirectParam !== "/" && redirectParam.startsWith(getRoleHomePath(role))) {
    if (typeof window !== "undefined") {
      window.location.replace(
        isAbsoluteUrl(home)
          ? `${normalizeOrigin(home.split(ROLE_ROUTES[role])[0] ?? home)}${redirectParam}`
          : redirectParam
      );
    }
    return;
  }

  if (typeof window !== "undefined") {
    window.location.replace(home);
  }
}
