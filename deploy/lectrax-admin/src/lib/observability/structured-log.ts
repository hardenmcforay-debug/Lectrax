/**
 * Structured JSON logging for Vercel / log drains.
 * Does not replace audit_logs — this is operational telemetry only.
 */

import {
  API_SUCCESS_LOG_SAMPLE_RATE,
  BUSINESS_EVENTS,
} from "@/lib/observability/constants";
import type { RequestLogContext } from "@/lib/observability/context";

type LogLevel = "debug" | "info" | "warn" | "error";

type StructuredLogFields = RequestLogContext & {
  scope?: string;
  event?: string;
  error?: string;
  errorName?: string;
  code?: string | null;
  [key: string]: unknown;
};

function shouldSample(rate: number): boolean {
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  return Math.random() < rate;
}

function emit(level: LogLevel, message: string, fields: StructuredLogFields = {}): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    service: "lectrax",
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    ...fields,
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}

export function logStructured(
  level: LogLevel,
  message: string,
  fields: StructuredLogFields = {}
): void {
  emit(level, message, fields);
}

export function logApiAccess(
  fields: RequestLogContext & { scope?: string; error?: string }
): void {
  const status = fields.status ?? fields.statusCode ?? 0;
  const isError = status >= 500 || Boolean(fields.error);
  const isClientError = status >= 400 && status < 500;

  if (!isError && !isClientError && !shouldSample(API_SUCCESS_LOG_SAMPLE_RATE)) {
    return;
  }

  emit(isError ? "error" : isClientError ? "warn" : "info", "api.request", {
    event: isError ? BUSINESS_EVENTS.API_ERROR : "api.request",
    status,
    statusCode: fields.statusCode ?? status,
    duration: fields.duration ?? fields.durationMs,
    ...fields,
  });
}

export function logOperationalEvent(
  event: string,
  fields: StructuredLogFields = {},
  level: LogLevel = "info"
): void {
  emit(level, event, { event, ...fields });
}
