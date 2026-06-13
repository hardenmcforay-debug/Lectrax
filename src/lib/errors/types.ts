export type ErrorCategory =
  | "auth"
  | "network"
  | "supabase"
  | "payment"
  | "data"
  | "form"
  | "unknown";

export type PlatformErrorCode =
  | "AUTH_INVALID"
  | "AUTH_SESSION_MISSING"
  | "NETWORK_OFFLINE"
  | "NETWORK_TIMEOUT"
  | "NETWORK_FAILURE"
  | "SERVICE_UNAVAILABLE"
  | "SUPABASE_UNAVAILABLE"
  | "PAYMENT_UNAVAILABLE"
  | "DATA_FETCH_FAILED"
  | "FORM_SUBMISSION_FAILED"
  | "UNKNOWN";

export interface PlatformError {
  category: ErrorCategory;
  code: PlatformErrorCode;
  userMessage: string;
  retryable: boolean;
  cause?: unknown;
}

export type AuthSessionResult =
  | { status: "authenticated"; user: { id: string; email?: string } }
  | { status: "unauthenticated" }
  | { status: "service_unavailable"; error?: unknown };

export type RoleResolutionResult =
  | { status: "ok"; role: import("@/types/database").UserRole }
  | { status: "no_role" }
  | { status: "service_unavailable"; error?: unknown };
