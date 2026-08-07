import type { PlatformError } from "@/lib/errors/types";
import { captureException } from "@/lib/observability/sentry";
import { logStructured } from "@/lib/observability/structured-log";

type LogContext = Record<string, unknown>;

const isProduction = process.env.NODE_ENV === "production";

function safeSerialize(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function sanitizeContext(context: LogContext): LogContext {
  if (!isProduction) return context;
  const safe: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (/secret|token|key|password|authorization|cookie/i.test(key)) continue;
    safe[key] = value;
  }
  return safe;
}

function toError(error: unknown): unknown {
  if (error instanceof Error) return error;
  if (error && typeof error === "object" && "cause" in error) {
    const cause = (error as { cause?: unknown }).cause;
    if (cause instanceof Error) return cause;
  }
  return new Error(safeSerialize(error));
}

export function logPlatformError(
  scope: string,
  error: PlatformError | unknown,
  context: LogContext = {}
): void {
  const payload =
    error && typeof error === "object" && "code" in error
      ? (error as PlatformError)
      : undefined;

  const message = payload
    ? `[${scope}] ${payload.code}: ${safeSerialize(payload.cause ?? payload)}`
    : `[${scope}] ${safeSerialize(error)}`;

  const safeContext = sanitizeContext({
    ...context,
    code: payload?.code,
    category: payload?.category,
    retryable: payload?.retryable,
  });

  // Single structured sink for log drains (and local console).
  logStructured("error", message, {
    scope,
    ...safeContext,
    error: safeSerialize(error),
  });

  captureException(toError(payload?.cause ?? error), {
    scope,
    tags: {
      "lectrax.scope": scope,
      ...(payload?.code ? { "lectrax.code": String(payload.code) } : {}),
    },
    extra: safeContext,
    level: "error",
  });
}

export function logClientCrash(scope: string, error: Error, context: LogContext = {}): void {
  const safeContext = sanitizeContext(context);
  const message = isProduction
    ? `[${scope}] ${error.name}: Application error`
    : `[${scope}] ${error.name}: ${error.message}`;

  logStructured("error", message, {
    scope,
    ...safeContext,
    errorName: error.name,
    error: isProduction ? "Application error" : error.message,
  });

  captureException(error, {
    scope,
    tags: { "lectrax.scope": scope, "lectrax.surface": "client" },
    extra: safeContext,
    level: "error",
  });
}

/** Log server-side failures without echoing raw error text in production. */
export function logServerError(scope: string, error: unknown, context: LogContext = {}): void {
  logPlatformError(scope, error, context);
}
