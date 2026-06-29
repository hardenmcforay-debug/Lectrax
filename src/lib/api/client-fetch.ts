import {
  buildInFlightRequestKey,
  dedupeInFlightGetRequest,
} from "@/lib/api/in-flight-dedup";
import {
  getAdaptiveFetchTimeoutMs,
  readConnectionQuality,
} from "@/lib/network/connection-quality";
import { isAbortError } from "@/lib/errors/classify";
import {
  getCsrfRequestHeaders,
  isMutationMethod,
  isSameOriginAppApiUrl,
} from "@/lib/security/csrf";

const DEFAULT_TIMEOUT_MS = 30_000;

export type AppFetchInit = RequestInit & {
  /** Request timeout in milliseconds. Defaults to 30s, or 45s on slow connections. */
  timeoutMs?: number;
  /** Coalesce identical in-flight GET requests. Default true for same-origin GET API calls. */
  dedupe?: boolean;
};

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const upstreamSignal = init.signal;
  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort();
    } else {
      upstreamSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      if (timedOut) {
        throw new Error("Request timed out. Please try again.");
      }
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Browser fetch for Lectrax same-origin API routes.
 * Sends session cookies and CSRF headers on mutating requests.
 */
export async function appFetch(
  input: RequestInfo | URL,
  init: AppFetchInit = {}
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const url = resolveUrl(input);
  const isAppApi = isSameOriginAppApiUrl(url);
  const isSafeRead = method === "GET" || method === "HEAD";
  const shouldDedupe = init.dedupe ?? (isAppApi && isSafeRead && init.cache !== "no-store");

  const headers = new Headers(init.headers);

  if (isAppApi && isMutationMethod(method)) {
    for (const [key, value] of Object.entries(getCsrfRequestHeaders())) {
      headers.set(key, value);
    }
  }

  const timeoutMs =
    init.timeoutMs ??
    getAdaptiveFetchTimeoutMs(
      typeof navigator !== "undefined"
        ? readConnectionQuality(navigator.onLine)
        : "online"
    );

  const requestInit: RequestInit = {
    ...init,
    credentials: init.credentials ?? (isAppApi ? "include" : "same-origin"),
    headers,
  };

  const execute = () => fetchWithTimeout(input, requestInit, timeoutMs);

  if (shouldDedupe) {
    const key = buildInFlightRequestKey(method, url);
    return dedupeInFlightGetRequest(key, execute);
  }

  return execute();
}

export { DEFAULT_TIMEOUT_MS as APP_FETCH_DEFAULT_TIMEOUT_MS };
