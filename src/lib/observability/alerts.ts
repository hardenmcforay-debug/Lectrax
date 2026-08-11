/**
 * Alert rule definitions for Sentry / on-call.
 * Import into Sentry Alert Rules UI or keep as the source of truth for thresholds.
 */

import { LATENCY, MEMORY_RSS_WARN_BYTES } from "@/lib/observability/constants";

export type AlertSeverity = "warning" | "critical";

export type ObservabilityAlert = {
  id: string;
  title: string;
  severity: AlertSeverity;
  description: string;
  /** Sentry issue / metric filter hint */
  condition: string;
  threshold: string;
  window: string;
  notify: string[];
};

export const OBSERVABILITY_ALERTS: ObservabilityAlert[] = [
  {
    id: "error-rate-spike",
    title: "Error rate increase",
    severity: "critical",
    description: "Application error events exceed baseline.",
    condition: "event.type:error OR tags[lectrax.event]:api.error",
    threshold: "> 20 events",
    window: "5 minutes",
    notify: ["sentry-slack", "pager"],
  },
  {
    id: "api-latency",
    title: "API latency exceeds threshold",
    severity: "warning",
    description: "Transaction duration P95 above budget.",
    condition: "transaction.duration",
    threshold: `P95 > ${LATENCY.API_P95_WARN_MS}ms (critical > ${LATENCY.API_P95_CRITICAL_MS}ms)`,
    window: "10 minutes",
    notify: ["sentry-slack"],
  },
  {
    id: "database-unavailable",
    title: "Database unavailable",
    severity: "critical",
    description: "Health/ready probes fail Supabase Postgres checks.",
    condition: "message:health.degraded AND tags[check]:database",
    threshold: ">= 1 failure",
    window: "2 minutes",
    notify: ["sentry-slack", "pager"],
  },
  {
    id: "auth-failure-spike",
    title: "Authentication failures spike",
    severity: "warning",
    description: "Login failures indicate credential stuffing or outage.",
    condition: "message:auth.login.failure",
    threshold: "> 30 events",
    window: "5 minutes",
    notify: ["sentry-slack"],
  },
  {
    id: "payment-failures",
    title: "Payment failures",
    severity: "critical",
    description: "Monime checkout or webhook activation failures.",
    condition: "message:payment.failure OR tags[lectrax.event]:payment.failure",
    threshold: ">= 1 event",
    window: "5 minutes",
    notify: ["sentry-slack", "pager"],
  },
  {
    id: "attendance-failures",
    title: "Attendance failures",
    severity: "warning",
    description: "QR scan / attendance recording failures.",
    condition: "message:attendance.qr.failure",
    threshold: "> 10 events",
    window: "10 minutes",
    notify: ["sentry-slack"],
  },
  {
    id: "cron-failures",
    title: "Cron jobs fail",
    severity: "critical",
    description: "Subscription lifecycle cron partial or total failure.",
    condition: "message:cron.failure OR message:subscription_lifecycle_partial_failure",
    threshold: ">= 1 event",
    window: "1 hour (after scheduled run)",
    notify: ["sentry-slack", "pager"],
  },
  {
    id: "memory-spike",
    title: "Memory usage spikes",
    severity: "warning",
    description: "Node RSS exceeds serverless budget during probes or requests.",
    condition: `tags[memory_rss_bytes]:>${MEMORY_RSS_WARN_BYTES}`,
    threshold: `RSS > ${Math.round(MEMORY_RSS_WARN_BYTES / (1024 * 1024))}MB`,
    window: "5 minutes",
    notify: ["sentry-slack"],
  },
  {
    id: "email-failures",
    title: "Email / password-reset failures",
    severity: "warning",
    description: "Password reset or outbound email delivery failures.",
    condition: "message:auth.password_reset.email_failure OR message:email.failure",
    threshold: "> 5 events",
    window: "15 minutes",
    notify: ["sentry-slack"],
  },
];
