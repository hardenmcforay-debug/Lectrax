/**
 * Observability constants — sampling, latency budgets, and alert thresholds.
 * Tuned for Vercel serverless + Supabase without over-sampling production traffic.
 */

export const REQUEST_ID_HEADER = "x-request-id";
export const REQUEST_ID_RESPONSE_HEADER = "x-request-id";

/** Future multi-tenant campus/org id (optional inbound header). */
export const TENANT_HEADER = "x-lectrax-tenant";

/** Production trace sample rate (Sentry performance / API tracing). */
export const TRACE_SAMPLE_RATE_PRODUCTION = 0.15;
export const TRACE_SAMPLE_RATE_DEVELOPMENT = 1.0;

/** Session Replay — sparse in happy path; always on errors. */
export const REPLAY_SESSION_SAMPLE_RATE = 0.05;
export const REPLAY_ON_ERROR_SAMPLE_RATE = 1.0;

/** Structured access logs for /api/* — 100% of errors, sampled successes. */
export const API_SUCCESS_LOG_SAMPLE_RATE = 0.2;

/** Latency budgets (ms) for probes and alerts. */
export const LATENCY = {
  HEALTH_PROBE_WARN_MS: 1_500,
  HEALTH_PROBE_FAIL_MS: 5_000,
  API_P95_WARN_MS: 2_000,
  API_P95_CRITICAL_MS: 5_000,
  DB_CHECK_TIMEOUT_MS: 3_000,
  STORAGE_CHECK_TIMEOUT_MS: 3_000,
  EXTERNAL_CHECK_TIMEOUT_MS: 4_000,
} as const;

/** Memory warn threshold on Node runtimes (RSS bytes). */
export const MEMORY_RSS_WARN_BYTES = 450 * 1024 * 1024;

export const BUSINESS_EVENTS = {
  LOGIN_SUCCESS: "auth.login.success",
  LOGIN_FAILURE: "auth.login.failure",
  REGISTRATION_SUCCESS: "auth.registration.success",
  REGISTRATION_FAILURE: "auth.registration.failure",
  PASSWORD_RESET_REQUESTED: "auth.password_reset.requested",
  PASSWORD_RESET_EMAIL_FAILURE: "auth.password_reset.email_failure",
  QR_ATTENDANCE_RECORDED: "attendance.qr.recorded",
  QR_ATTENDANCE_FAILURE: "attendance.qr.failure",
  ASSIGNMENT_UPLOAD_SUCCESS: "assignment.upload.success",
  ASSIGNMENT_UPLOAD_FAILURE: "assignment.upload.failure",
  GRADE_PUBLISHED: "grades.published",
  GRADE_PUBLISH_FAILURE: "grades.publish.failure",
  PAYMENT_SUCCESS: "payment.success",
  PAYMENT_FAILURE: "payment.failure",
  SUBSCRIPTION_ACTIVATED: "subscription.activated",
  EMAIL_FAILURE: "email.failure",
  API_ERROR: "api.error",
  API_VALIDATION_FAILURE: "api.validation_failure",
  API_AUTHORIZATION_FAILURE: "api.authorization_failure",
  API_RATE_LIMIT_FAILURE: "api.rate_limit_failure",
  CRON_FAILURE: "cron.failure",
  CRON_SUCCESS: "cron.success",
  HEALTH_DEGRADED: "health.degraded",
} as const;

/** Classified API request outcomes for structured access logs. */
export type ApiRequestOutcome =
  | "success"
  | "validation_failure"
  | "authorization_failure"
  | "rate_limit_failure"
  | "server_error"
  | "client_error";

export function classifyApiOutcome(statusCode: number): ApiRequestOutcome {
  if (statusCode >= 500) return "server_error";
  if (statusCode === 429) return "rate_limit_failure";
  if (statusCode === 401 || statusCode === 403) return "authorization_failure";
  if (statusCode === 400 || statusCode === 422) return "validation_failure";
  if (statusCode >= 400) return "client_error";
  return "success";
}

export type BusinessEventName =
  (typeof BUSINESS_EVENTS)[keyof typeof BUSINESS_EVENTS];
