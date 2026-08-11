/**
 * Safe Sentry helpers — no-ops when the SDK is disabled (no DSN).
 * Sentry is loaded lazily so API route imports stay light in tests/cold start.
 */

function hasSentryDsn(): boolean {
  return Boolean(
    process.env.SENTRY_DSN?.trim() ||
      process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()
  );
}

async function getSentry() {
  if (!hasSentryDsn()) return null;
  return import("@sentry/nextjs");
}

export function captureException(
  error: unknown,
  context?: {
    scope?: string;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    userId?: string | null;
    level?: "fatal" | "error" | "warning" | "info";
  }
): void {
  if (!hasSentryDsn()) return;

  void getSentry().then((Sentry) => {
    if (!Sentry) return;
    Sentry.withScope((scope) => {
      if (context?.scope) scope.setTag("lectrax.scope", context.scope);
      if (context?.tags) {
        for (const [key, value] of Object.entries(context.tags)) {
          scope.setTag(key, value);
        }
      }
      if (context?.extra) scope.setExtras(context.extra);
      if (context?.userId) scope.setUser({ id: context.userId });
      if (context?.level) scope.setLevel(context.level);
      Sentry.captureException(error);
    });
  });
}

export function captureMessage(
  message: string,
  context?: {
    level?: "fatal" | "error" | "warning" | "info";
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): void {
  if (!hasSentryDsn()) return;

  void getSentry().then((Sentry) => {
    if (!Sentry) return;
    Sentry.withScope((scope) => {
      if (context?.tags) {
        for (const [key, value] of Object.entries(context.tags)) {
          scope.setTag(key, value);
        }
      }
      if (context?.extra) scope.setExtras(context.extra);
      Sentry.captureMessage(message, context?.level ?? "info");
    });
  });
}

export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: "fatal" | "error" | "warning" | "info" | "debug";
  data?: Record<string, unknown>;
}): void {
  if (!hasSentryDsn()) return;
  void getSentry().then((Sentry) => {
    if (!Sentry) return;
    Sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level ?? "info",
      data: breadcrumb.data,
    });
  });
}

export function setSentryUser(user: { id: string; email?: string | null } | null): void {
  if (!hasSentryDsn()) return;
  void getSentry().then((Sentry) => {
    if (!Sentry) return;
    if (!user) {
      Sentry.setUser(null);
      return;
    }
    Sentry.setUser({ id: user.id, email: user.email ?? undefined });
  });
}

export async function startServerSpan<T>(
  options: {
    name: string;
    op?: string;
    attributes?: Record<string, string | number | boolean | undefined>;
  },
  fn: () => Promise<T> | T
): Promise<T> {
  const Sentry = await getSentry();
  if (!Sentry) {
    return fn();
  }

  return Sentry.startSpan(
    {
      name: options.name,
      op: options.op ?? "http.server",
      attributes: options.attributes,
    },
    fn
  );
}

export async function flushSentry(timeoutMs = 2_000): Promise<void> {
  const Sentry = await getSentry();
  if (!Sentry) return;
  await Sentry.flush(timeoutMs);
}
