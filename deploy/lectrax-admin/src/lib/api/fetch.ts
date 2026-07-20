import {
  classifyApiResponse,
  classifyFetchFailure,
  createPlatformError,
  isAbortError,
  sanitizeErrorMessage,
} from "@/lib/errors/classify";
import { logPlatformError } from "@/lib/errors/logger";
import type { PlatformError } from "@/lib/errors/types";
import {
  getCsrfRequestHeaders,
  isMutationMethod,
  isSameOriginAppApiUrl,
} from "@/lib/security/csrf";

export type PlatformFetchResult<T> =
  | { ok: true; data: T; response: Response }
  | { ok: false; error: PlatformError; response?: Response };

type PlatformFetchOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 600;

function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
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

  const method = (init.method ?? "GET").toUpperCase();
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input instanceof Request
          ? input.url
          : String(input);

  const headers = new Headers(init.headers);
  const isAppApi = isSameOriginAppApiUrl(url);

  if (isAppApi && isMutationMethod(method)) {
    for (const [key, value] of Object.entries(getCsrfRequestHeaders())) {
      headers.set(key, value);
    }
  }

  try {
    return await fetch(input, {
      ...init,
      credentials: init.credentials ?? (isAppApi ? "include" : "same-origin"),
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error) && timedOut) {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function platformFetch<T = unknown>(
  input: RequestInfo | URL,
  options: PlatformFetchOptions = {}
): Promise<PlatformFetchResult<T>> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    ...init
  } = options;

  if (isOffline()) {
    const error = classifyFetchFailure(null, true);
    logPlatformError("platformFetch", error, { url: String(input) });
    return { ok: false, error };
  }

  let lastError: PlatformError | undefined;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, init, timeoutMs);
      let data: T | null = null;

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        data = (await response.json()) as T;
      }

      if (!response.ok) {
        const body = data as { error?: string; code?: string } | null;
        const error = classifyApiResponse(response.status, body);
        error.userMessage = sanitizeErrorMessage(body?.error) || error.userMessage;

        if (error.retryable && attempt < retries) {
          lastError = error;
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }

        logPlatformError("platformFetch", error, {
          url: String(input),
          status: response.status,
        });
        return { ok: false, error, response };
      }

      return { ok: true, data: data as T, response };
    } catch (cause) {
      const error = classifyFetchFailure(cause, isOffline());
      lastError = error;

      if (error.retryable && attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }

      logPlatformError("platformFetch", error, { url: String(input) });
      return { ok: false, error };
    }
  }

  return {
    ok: false,
    error: lastError ?? createPlatformError("unknown", "UNKNOWN"),
  };
}

export function getErrorMessage(result: { ok: false; error: PlatformError }): string {
  return result.error.userMessage;
}
