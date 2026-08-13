const RESET_PASSWORD_PATH = "/reset-password";

function normalizeAppOrigin(appOrigin: string): string {
  return appOrigin.replace(/\/$/, "");
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
 * Password-recovery redirect target.
 * Still uses /auth/callback (allowed in Supabase redirect URLs). The callback
 * must not consume the one-time code — it forwards to /reset-password for
 * browser exchange so email scanners cannot burn the link on prefetch.
 */
export function getPasswordResetCallbackUrl(appOrigin: string): string {
  const callbackUrl = new URL("/auth/callback", recoveryEmailOrigin(appOrigin));
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

export const PASSWORD_RESET_PAGE_PATH = RESET_PASSWORD_PATH;
