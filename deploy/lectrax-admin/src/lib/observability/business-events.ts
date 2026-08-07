/**
 * Business-event telemetry.
 *
 * - Emits structured logs + Sentry breadcrumbs/messages for ops alerts
 * - Does NOT write audit_logs (that stays in logAudit / logSystemAudit)
 * - Call from audit hooks or critical failure paths only — avoid double logging
 */

import {
  BUSINESS_EVENTS,
  type BusinessEventName,
} from "@/lib/observability/constants";
import {
  addBreadcrumb,
  captureMessage,
} from "@/lib/observability/sentry";
import { logOperationalEvent } from "@/lib/observability/structured-log";

export { BUSINESS_EVENTS };
export type { BusinessEventName };

type EventSeverity = "info" | "warning" | "error";

const FAILURE_EVENTS = new Set<string>([
  BUSINESS_EVENTS.LOGIN_FAILURE,
  BUSINESS_EVENTS.REGISTRATION_FAILURE,
  BUSINESS_EVENTS.PASSWORD_RESET_EMAIL_FAILURE,
  BUSINESS_EVENTS.QR_ATTENDANCE_FAILURE,
  BUSINESS_EVENTS.ASSIGNMENT_UPLOAD_FAILURE,
  BUSINESS_EVENTS.GRADE_PUBLISH_FAILURE,
  BUSINESS_EVENTS.PAYMENT_FAILURE,
  BUSINESS_EVENTS.EMAIL_FAILURE,
  BUSINESS_EVENTS.API_ERROR,
  BUSINESS_EVENTS.API_VALIDATION_FAILURE,
  BUSINESS_EVENTS.API_AUTHORIZATION_FAILURE,
  BUSINESS_EVENTS.API_RATE_LIMIT_FAILURE,
  BUSINESS_EVENTS.CRON_FAILURE,
  BUSINESS_EVENTS.HEALTH_DEGRADED,
]);

/** Map durable audit action names → business telemetry events. */
const AUDIT_ACTION_TO_EVENT: Record<string, BusinessEventName> = {
  password_reset_requested: BUSINESS_EVENTS.PASSWORD_RESET_REQUESTED,
  attendance_marked_present: BUSINESS_EVENTS.QR_ATTENDANCE_RECORDED,
  duplicate_attendance_scan_attempt: BUSINESS_EVENTS.QR_ATTENDANCE_FAILURE,
  attendance_scan_blocked_device_bound: BUSINESS_EVENTS.QR_ATTENDANCE_FAILURE,
  assignment_submission_rejected: BUSINESS_EVENTS.ASSIGNMENT_UPLOAD_FAILURE,
  subscription_lifecycle_partial_failure: BUSINESS_EVENTS.CRON_FAILURE,
  payment_activation_failed: BUSINESS_EVENTS.PAYMENT_FAILURE,
  partnership_payment_completion_failed: BUSINESS_EVENTS.PAYMENT_FAILURE,
  payment_activation_blocked_admin_granted: BUSINESS_EVENTS.PAYMENT_FAILURE,
};

export function trackBusinessEvent(
  event: BusinessEventName | string,
  data: Record<string, unknown> = {},
  options?: { severity?: EventSeverity; userId?: string | null }
): void {
  const severity: EventSeverity =
    options?.severity ??
    (FAILURE_EVENTS.has(event) ? "error" : "info");

  const fields = {
    ...data,
    userId: options?.userId ?? (typeof data.userId === "string" ? data.userId : null),
  };

  logOperationalEvent(event, fields, severity === "error" ? "error" : severity === "warning" ? "warn" : "info");

  addBreadcrumb({
    category: "business",
    message: event,
    level: severity === "error" ? "error" : severity === "warning" ? "warning" : "info",
    data: fields,
  });

  if (severity === "error") {
    captureMessage(event, {
      level: "error",
      tags: { "lectrax.event": event },
      extra: fields,
    });
  }
}

/** Bridge from audit_logs inserts — one telemetry emit per audit write. */
export function trackBusinessEventFromAudit(
  action: string,
  metadata: Record<string, unknown> = {},
  actorId?: string | null
): void {
  const event = AUDIT_ACTION_TO_EVENT[action];
  if (!event) {
    // Unknown audit actions still get a low-noise breadcrumb for diagnosis.
    addBreadcrumb({
      category: "audit",
      message: action,
      level: "info",
      data: { ...metadata, actorId: actorId ?? null },
    });
    return;
  }

  trackBusinessEvent(event, { ...metadata, auditAction: action }, {
    userId: actorId,
    severity: FAILURE_EVENTS.has(event) ? "error" : "info",
  });
}
