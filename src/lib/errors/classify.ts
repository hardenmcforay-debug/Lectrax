import type { AuthError } from "@supabase/supabase-js";
import type { ErrorCategory, PlatformError, PlatformErrorCode } from "@/lib/errors/types";
import { getMessageForCode } from "@/lib/errors/messages";

const DEFINITIVE_AUTH_CODES = new Set([
  "refresh_token_not_found",
  "invalid_refresh_token",
  "session_not_found",
  "user_not_found",
  "bad_jwt",
  "invalid_jwt",
]);

const TRANSIENT_MESSAGE_PATTERNS = [
  /fetch failed/i,
  /failed to fetch/i,
  /network/i,
  /timeout/i,
  /timed out/i,
  /econnrefused/i,
  /enotfound/i,
  /socket/i,
  /aborted/i,
  /temporarily unavailable/i,
  /service unavailable/i,
  /bad gateway/i,
  /gateway timeout/i,
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

export function isTransientError(error: unknown): boolean {
  if (!error) return false;

  const status = getErrorStatus(error);
  if (status === 408 || status === 429 || (status !== undefined && status >= 500)) {
    return true;
  }

  const code = getErrorCode(error);
  if (
    code &&
    ["PGRST301", "PGRST000", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"].includes(code)
  ) {
    return true;
  }

  const message = getErrorMessage(error);
  return TRANSIENT_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));
}

export function isDefinitiveAuthError(error: unknown): boolean {
  if (!error) return false;

  const code = getErrorCode(error);
  if (code && DEFINITIVE_AUTH_CODES.has(code)) {
    return true;
  }

  const status = getErrorStatus(error);
  if (status === 401) {
    const message = getErrorMessage(error).toLowerCase();
    if (
      message.includes("refresh") ||
      message.includes("jwt") ||
      message.includes("session") ||
      message.includes("token")
    ) {
      return true;
    }
  }

  const message = getErrorMessage(error);
  if (/auth session missing/i.test(message)) {
    return true;
  }

  if (error && typeof error === "object" && "name" in error) {
    const name = String((error as { name: unknown }).name);
    if (name === "AuthSessionMissingError") {
      return true;
    }
    if (name === "AuthRetryableFetchError") {
      return true;
    }
  }

  return false;
}

export function isTransientDbError(error: unknown): boolean {
  return isTransientError(error);
}

export function hasSupabaseAuthCookies(
  cookies: Array<{ name: string; value: string }>
): boolean {
  return cookies.some(
    (cookie) =>
      cookie.name.includes("-auth-token") ||
      (cookie.name.startsWith("sb-") && cookie.name.includes("auth"))
  );
}

export function classifyFetchFailure(error: unknown, offline = false): PlatformError {
  if (offline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return createPlatformError("network", "NETWORK_OFFLINE");
  }

  if (isTransientError(error)) {
    const message = getErrorMessage(error);
    if (/timeout|timed out/i.test(message)) {
      return createPlatformError("network", "NETWORK_TIMEOUT", error);
    }
    return createPlatformError("network", "NETWORK_FAILURE", error);
  }

  return createPlatformError("unknown", "UNKNOWN", error);
}

export function classifyApiResponse(
  status: number,
  body?: { error?: string; code?: string } | null
): PlatformError {
  if (status === 401) {
    if (body?.code && DEFINITIVE_AUTH_CODES.has(body.code)) {
      return createPlatformError("auth", "AUTH_INVALID");
    }
    return createPlatformError("auth", "AUTH_SESSION_MISSING");
  }

  if (body?.code === "PAYMENT_UNAVAILABLE") {
    return createPlatformError("payment", "PAYMENT_UNAVAILABLE");
  }

  if (status === 402) {
    return createPlatformError("payment", "PAYMENT_UNAVAILABLE");
  }

  if (status === 503 || status === 502 || status === 504) {
    return createPlatformError("supabase", "SERVICE_UNAVAILABLE");
  }

  if (status >= 500) {
    return createPlatformError("supabase", "SUPABASE_UNAVAILABLE");
  }

  return createPlatformError("data", "DATA_FETCH_FAILED");
}

export function createPlatformError(
  category: ErrorCategory,
  code: PlatformErrorCode,
  cause?: unknown
): PlatformError {
  const { title, description } = getMessageForCode(code);
  return {
    category,
    code,
    userMessage: `${title}. ${description}`,
    retryable: code !== "AUTH_INVALID" && code !== "AUTH_SESSION_MISSING",
    cause,
  };
}

export function sanitizeErrorMessage(message: string | undefined | null): string {
  if (!message) {
    return getMessageForCode("UNKNOWN").description;
  }

  const unsafePatterns = [
    /supabase/i,
    /postgres/i,
    /sql/i,
    /pgrst/i,
    /jwt/i,
    /api[_-]?key/i,
    /secret/i,
    /stack trace/i,
    /at\s+\w+\s*\(/i,
    /ECONNREFUSED/i,
    /\/api\//i,
  ];

  if (unsafePatterns.some((pattern) => pattern.test(message))) {
    return getMessageForCode("UNKNOWN").description;
  }

  if (message.length > 180) {
    return getMessageForCode("UNKNOWN").description;
  }

  return message;
}

export function isAuthApiError(error: AuthError | null | undefined): boolean {
  if (!error) return false;
  return isDefinitiveAuthError(error);
}
