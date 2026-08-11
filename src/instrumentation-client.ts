import * as Sentry from "@sentry/nextjs";
import {
  REPLAY_ON_ERROR_SAMPLE_RATE,
  REPLAY_SESSION_SAMPLE_RATE,
  TRACE_SAMPLE_RATE_DEVELOPMENT,
  TRACE_SAMPLE_RATE_PRODUCTION,
} from "@/lib/observability/constants";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate:
      process.env.NODE_ENV === "development"
        ? TRACE_SAMPLE_RATE_DEVELOPMENT
        : TRACE_SAMPLE_RATE_PRODUCTION,
    enableLogs: true,
    integrations: [
      Sentry.replayIntegration({
        maskAllInputs: true,
        maskAllText: false,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: REPLAY_SESSION_SAMPLE_RATE,
    replaysOnErrorSampleRate: REPLAY_ON_ERROR_SAMPLE_RATE,
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      /^AbortError/,
      /Loading chunk [\d]+ failed/,
    ],
    beforeSend(event) {
      if (event.extra) {
        for (const key of Object.keys(event.extra)) {
          if (/secret|password|authorization|cookie|token/i.test(key)) {
            delete event.extra[key];
          }
        }
      }
      return event;
    },
  });
}

export const onRouterTransitionStart = dsn
  ? Sentry.captureRouterTransitionStart
  : () => {};
