import { validateProductionEnv } from "@/lib/env";

function hasSentryDsn(): boolean {
  return Boolean(
    process.env.SENTRY_DSN?.trim() ||
      process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()
  );
}

export async function register() {
  if (hasSentryDsn()) {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      await import("../sentry.server.config");
    }

    if (process.env.NEXT_RUNTIME === "edge") {
      await import("../sentry.edge.config");
    }
  }

  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  // Skip during `next build`; validate when the production server starts.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const result = validateProductionEnv();

  for (const warning of result.warnings) {
    console.warn(`[env] ${warning}`);
  }

  if (!result.ok) {
    console.error("[env] Production environment validation failed:");
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    throw new Error(
      `Production environment misconfigured: ${result.errors.join("; ")}`
    );
  }

  console.info("[env] Production environment validated successfully");
}

export async function onRequestError(
  error: unknown,
  request: unknown,
  context: unknown
) {
  if (!hasSentryDsn()) return;
  const Sentry = await import("@sentry/nextjs");
  return (
    Sentry.captureRequestError as (
      error: unknown,
      request: unknown,
      context: unknown
    ) => unknown
  )(error, request, context);
}
