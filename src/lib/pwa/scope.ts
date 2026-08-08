/**
 * Installed PWA URLs live under `/go/*` so marketing routes (`/`, `/about`, …)
 * stay outside the Web App Manifest scope and open in the browser — not the app.
 */

export const PWA_SCOPE_PREFIX = "/go";

/** Public marketing site — must stay out of the installed-app scope. */
export const MARKETING_PATH_PREFIXES = [
  "/",
  "/about",
  "/contact",
  "/cookies",
  "/partnerships",
  "/pricing",
  "/privacy",
  "/products",
  "/terms",
] as const;

export function isPwaScopePath(pathname: string): boolean {
  return pathname === PWA_SCOPE_PREFIX || pathname.startsWith(`${PWA_SCOPE_PREFIX}/`);
}

export function stripPwaScopePrefix(pathname: string): string {
  if (pathname === PWA_SCOPE_PREFIX || pathname === `${PWA_SCOPE_PREFIX}/`) {
    return "/login";
  }
  if (pathname.startsWith(`${PWA_SCOPE_PREFIX}/`)) {
    const stripped = pathname.slice(PWA_SCOPE_PREFIX.length);
    return stripped.length > 0 ? stripped : "/login";
  }
  return pathname;
}

export function toPwaScopePath(pathname: string): string {
  if (isPwaScopePath(pathname)) return pathname;
  if (!pathname.startsWith("/")) return `${PWA_SCOPE_PREFIX}/login`;
  if (pathname === "/") return `${PWA_SCOPE_PREFIX}/login`;
  return `${PWA_SCOPE_PREFIX}${pathname}`;
}

export function isMarketingPath(pathname: string): boolean {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (path === "/") return true;

  return MARKETING_PATH_PREFIXES.some(
    (prefix) => prefix !== "/" && (path === prefix || path.startsWith(`${prefix}/`))
  );
}

/** App-shell destinations that belong inside the installed PWA scope. */
export function isAppShellPath(pathname: string): boolean {
  const path = stripPwaScopePrefix(pathname);
  if (isMarketingPath(path)) return false;

  return (
    path === "/login" ||
    path === "/signup" ||
    path === "/forgot-password" ||
    path === "/reset-password" ||
    path === "/offline" ||
    path === "/payments/return" ||
    path.startsWith("/auth/") ||
    path.startsWith("/student") ||
    path.startsWith("/lecturer") ||
    path.startsWith("/admin") ||
    path.startsWith("/api/")
  );
}
