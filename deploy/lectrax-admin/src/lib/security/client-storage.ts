/**
 * Client-side browser storage keys and cleanup helpers.
 * Avoid persisting credentials, tokens, or unnecessary PII in the browser.
 */

import { clearAllOfflineCache } from "@/lib/offline/cache";

/** Login identifier saved only when the user opts into "Remember me". */
export const REMEMBER_LOGIN_IDENTIFIER_STORAGE_KEY = "lectrax_remember_login_identifier";

/** @deprecated Use REMEMBER_LOGIN_IDENTIFIER_STORAGE_KEY */
export const REMEMBER_EMAIL_STORAGE_KEY = REMEMBER_LOGIN_IDENTIFIER_STORAGE_KEY;

/** Attendance device UUID — operational anti-fraud identifier, not an auth secret. */
export { ATTENDANCE_DEVICE_ID_KEY } from "@/lib/attendance/device-identity";

const SENSITIVE_QUERY_PARAMS = ["token", "payment", "access_token", "refresh_token"] as const;

/** Remove sensitive values from the current URL without a navigation reload. */
export function stripSensitiveUrlParams(extraKeys: string[] = []): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  let changed = false;

  for (const key of [...SENSITIVE_QUERY_PARAMS, ...extraKeys]) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  if (!changed) return;

  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

/** Clear client-side caches that may hold profile or session-related data. */
export function clearSensitiveClientStorage(): void {
  clearAllOfflineCache();
}
