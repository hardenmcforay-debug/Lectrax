const RESET_PASSWORD_PATH = "/reset-password";
const AUTH_CALLBACK_PATH = "/auth/callback";

function normalizeAppOrigin(appOrigin: string): string {
  return appOrigin.replace(/\/$/, "");
}

function normalizePathname(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0] || pathname;
  if (path === "/go" || path === "/go/") {
    return "/login";
  }
  if (path.startsWith("/go/")) {
    const stripped = path.slice("/go".length);
    return stripped.length > 0 ? stripped : "/login";
  }
  return path;
}

/** Keep recovery emails on www so PKCE cookies match the live host. */
function recoveryEmailOrigin(appOrigin: string): string {
  const origin = normalizeAppOrigin(appOrigin);
  try {
    const parsed = new URL(origin);
    if (parsed.hostname === "lectrax.com") {
      parsed.hostname = "www.lectrax.com";
      return parsed.origin;
    }
  } catch {
    // keep as-is
  }
  return origin;
}

/**
 * Password-recovery email redirect.
 * Lands on /reset-password (not /auth/callback) so hash tokens and PKCE codes
 * are handled in the browser. /auth/callback is a Route Handler GET that cannot
 * read URL hashes and previously sent those links to sign-in.
 */
export function getPasswordResetCallbackUrl(appOrigin: string): string {
  return new URL(RESET_PASSWORD_PATH, recoveryEmailOrigin(appOrigin)).toString();
}

/**
 * Legacy redirect still allowlisted in many Supabase projects.
 * Used only if /reset-password is rejected as a redirect URL.
 */
export function getPasswordResetAuthCallbackUrl(appOrigin: string): string {
  const callbackUrl = new URL(AUTH_CALLBACK_PATH, recoveryEmailOrigin(appOrigin));
  callbackUrl.searchParams.set("next", RESET_PASSWORD_PATH);
  callbackUrl.searchParams.set("type", "recovery");
  return callbackUrl.toString();
}

/** @deprecated Use getPasswordResetCallbackUrl */
export function getPasswordResetRedirectUrl(appOrigin: string): string {
  return getPasswordResetCallbackUrl(appOrigin);
}

export function isPasswordRecoveryCallback(params: {
  type: string | null;
  next: string | null;
}): boolean {
  if (params.type === "recovery") {
    return true;
  }

  const next = params.next?.trim();
  if (!next) {
    return false;
  }

  try {
    const normalized = next.startsWith("/") ? next : new URL(next, "http://local").pathname;
    return normalized === RESET_PASSWORD_PATH || normalized.endsWith(RESET_PASSWORD_PATH);
  } catch {
    return next === RESET_PASSWORD_PATH;
  }
}

/** Paths that must stay on the site cookie jar — never rewritten to /go/login. */
export function isPasswordRecoveryLandingPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return (
    path === RESET_PASSWORD_PATH ||
    path === AUTH_CALLBACK_PATH ||
    path.startsWith(`${RESET_PASSWORD_PATH}/`) ||
    path.startsWith(`${AUTH_CALLBACK_PATH}/`)
  );
}

export const PASSWORD_RESET_PAGE_PATH = RESET_PASSWORD_PATH;
