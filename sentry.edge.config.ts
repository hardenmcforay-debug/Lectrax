import * as Sentry from "@sentry/nextjs";
import {
  TRACE_SAMPLE_RATE_DEVELOPMENT,
  TRACE_SAMPLE_RATE_PRODUCTION,
} from "@/lib/observability/constants";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate:
    process.env.NODE_ENV === "development"
      ? TRACE_SAMPLE_RATE_DEVELOPMENT
      : Math.min(TRACE_SAMPLE_RATE_PRODUCTION, 0.1),
  enableLogs: true,
  sendDefaultPii: false,
});
