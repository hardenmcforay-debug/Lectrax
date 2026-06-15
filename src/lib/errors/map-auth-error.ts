import type { AuthError } from "@supabase/supabase-js";
import {
  AUTH_OFFLINE_MESSAGE,
  AUTH_SERVICE_UNAVAILABLE_MESSAGE,
  getAuthNetworkMessage,
  type AuthErrorContext,
  type AuthUserMessage,
} from "@/lib/errors/auth-messages";
import { isTransientError, createPlatformError } from "@/lib/errors/classify";
import { logPlatformError } from "@/lib/errors/logger";

const RAW_NETWORK_PATTERNS = [
  /failed to fetch/i,
  /networkerror/i,
  /err_network/i,
  /fetcherror/i,
  /connection refused/i,
  /network request failed/i,
  /load failed/i,
  /authretryablefetcherror/i,
  /err_internet_disconnected/i,
  /err_connection_refused/i,
  /err_connection_reset/i,
  /err_name_not_resolved/i,
];

const SERVICE_UNAVAILABLE_PATTERNS = [
  /service unavailable/i,
  /bad gateway/i,
  /gateway timeout/i,
  /temporarily unavailable/i,
];

const CREDENTIAL_ERROR_PATTERNS = [
  /invalid login credentials/i,
  /invalid email or password/i,
  /email not confirmed/i,
  /user already registered/i,
  /password should be at least/i,
  /signup requires/i,
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

function getErrorName(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (error && typeof error === "object" && "name" in error) {
    return String((error as { name: unknown }).name);
  }
  return "";
}

function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

export function isDeviceOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export function isNetworkAuthError(error: unknown): boolean {
  if (isDeviceOffline()) return true;

  if (isTransientError(error)) {
    const message = getErrorMessage(error);
    if (CREDENTIAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
      return false;
    }
    return true;
  }

  const message = getErrorMessage(error);
  const name = getErrorName(error);
  const combined = `${name} ${message}`;

  return RAW_NETWORK_PATTERNS.some((pattern) => pattern.test(combined));
}

export function isServiceUnavailableError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 502 || status === 503 || status === 504) {
    return true;
  }

  const message = getErrorMessage(error);
  return SERVICE_UNAVAILABLE_PATTERNS.some((pattern) => pattern.test(message));
}

function sanitizeCredentialMessage(message: string, context: AuthErrorContext): string {
  if (RAW_NETWORK_PATTERNS.some((pattern) => pattern.test(message))) {
    return getAuthNetworkMessage(context).description;
  }

  if (context === "login" && /invalid login credentials/i.test(message)) {
    return "Sign in failed. Please check your email and password.";
  }

  if (context === "signup" && /user already registered/i.test(message)) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (context === "signup" && /email not confirmed/i.test(message)) {
    return "Please confirm your email before signing in.";
  }

  if (message.length > 0 && message.length <= 180) {
    return message;
  }

  return context === "login"
    ? "Sign in failed. Please check your email and password."
    : "Could not complete your request. Please try again.";
}

export function mapAuthError(
  error: unknown,
  context: AuthErrorContext,
  logScope?: string
): AuthUserMessage {
  if (logScope) {
    logPlatformError(logScope, createPlatformError("auth", "FORM_SUBMISSION_FAILED", error));
  }

  if (isDeviceOffline()) {
    return AUTH_OFFLINE_MESSAGE;
  }

  if (isServiceUnavailableError(error)) {
    return AUTH_SERVICE_UNAVAILABLE_MESSAGE;
  }

  if (isNetworkAuthError(error)) {
    return getAuthNetworkMessage(context);
  }

  const message = getErrorMessage(error);

  if (RAW_NETWORK_PATTERNS.some((pattern) => pattern.test(message))) {
    return getAuthNetworkMessage(context);
  }

  return {
    title: context === "login" ? "Sign In Failed" : "Request Failed",
    description: sanitizeCredentialMessage(message, context),
    retryable: false,
  };
}

export function mapSupabaseAuthError(
  error: AuthError | null | undefined,
  context: AuthErrorContext,
  logScope?: string
): AuthUserMessage | null {
  if (!error) return null;
  return mapAuthError(error, context, logScope);
}
