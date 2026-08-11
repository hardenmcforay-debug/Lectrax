import { randomUUID } from "crypto";
import { REQUEST_ID_HEADER } from "@/lib/observability/constants";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

export function createRequestId(): string {
  return randomUUID();
}

export function normalizeRequestId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!REQUEST_ID_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/** Prefer inbound correlation ID; otherwise mint a new one. */
export function resolveRequestId(request: Request): string {
  const incoming =
    normalizeRequestId(request.headers.get(REQUEST_ID_HEADER)) ??
    normalizeRequestId(request.headers.get("x-correlation-id"));
  return incoming ?? createRequestId();
}

export function getRequestIdFromHeaders(headers: Headers): string | null {
  return (
    normalizeRequestId(headers.get(REQUEST_ID_HEADER)) ??
    normalizeRequestId(headers.get("x-correlation-id"))
  );
}
