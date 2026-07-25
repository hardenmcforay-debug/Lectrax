const RESET_PASSWORD_PATH = "/reset-password";

function normalizeAppOrigin(appOrigin: string): string {
  return appOrigin.replace(/\/$/, "");
}

/**
 * Password-recovery redirect target.
 * Must go through /auth/callback so the auth `code` is exchanged server-side while the
 * browser still has the PKCE code_verifier cookie from resetPasswordForEmail.
 */
export function getPasswordResetCallbackUrl(appOrigin: string): string {
  const callbackUrl = new URL("/auth/callback", normalizeAppOrigin(appOrigin));
  callbackUrl.searchParams.set("next", RESET_PASSWORD_PATH);
  callbackUrl.searchParams.set("type", "recovery");
  return callbackUrl.toString();
}

/** @deprecated Use getPasswordResetCallbackUrl — direct /reset-password breaks server-started PKCE. */
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
