import {
  getCsrfRequestHeaders,
  isMutationMethod,
  isSameOriginAppApiUrl,
} from "@/lib/security/csrf";

/**
 * Browser fetch for Lectrax same-origin API routes.
 * Sends session cookies and CSRF headers on mutating requests.
 */
export async function appFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  const headers = new Headers(init.headers);
  const isAppApi = isSameOriginAppApiUrl(url);

  if (isAppApi && isMutationMethod(method)) {
    for (const [key, value] of Object.entries(getCsrfRequestHeaders())) {
      headers.set(key, value);
    }
  }

  return fetch(input, {
    ...init,
    credentials: init.credentials ?? (isAppApi ? "include" : "same-origin"),
    headers,
  });
}
