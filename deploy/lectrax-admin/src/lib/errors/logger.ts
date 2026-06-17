import type { PlatformError } from "@/lib/errors/types";

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
    if (/secret|token|key|password|authorization/i.test(key)) continue;
    safe[key] = value;
  }
  return safe;
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

  if (isProduction) {
    console.error(message, sanitizeContext({ ...context, code: payload?.code }));
    return;
  }

  console.error(message, {
    ...context,
    category: payload?.category,
    code: payload?.code,
    retryable: payload?.retryable,
  });
}

export function logClientCrash(scope: string, error: Error, context: LogContext = {}): void {
  console.error(`[${scope}] ${error.name}: ${error.message}`, sanitizeContext(context));
}
