const RESET_PASSWORD_PATH = "/reset-password";

function normalizeAppOrigin(appOrigin: string): string {
  return appOrigin.replace(/\/$/, "");
}

/** Direct reset page URL — preferred for PWA (client-side code exchange, no redirect cookie loss). */
export function getPasswordResetRedirectUrl(appOrigin: string): string {
  return new URL(RESET_PASSWORD_PATH, normalizeAppOrigin(appOrigin)).toString();
}

/** Server callback fallback when the reset page cannot exchange the code client-side. */
export function getPasswordResetCallbackUrl(appOrigin: string): string {
  const callbackUrl = new URL("/auth/callback", normalizeAppOrigin(appOrigin));
  callbackUrl.searchParams.set("next", RESET_PASSWORD_PATH);
  return callbackUrl.toString();
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
