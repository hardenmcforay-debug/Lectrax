const RESET_PASSWORD_PATH = "/reset-password";

export function getPasswordResetCallbackUrl(appOrigin: string): string {
  const callbackUrl = new URL("/auth/callback", appOrigin.replace(/\/$/, ""));
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
