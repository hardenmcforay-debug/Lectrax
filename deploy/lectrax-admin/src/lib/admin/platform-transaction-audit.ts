/** Audit log actions recorded for platform payment and subscription transactions. */
export const PLATFORM_TRANSACTION_AUDIT_ACTIONS = [
  "payment_checkout_started",
  "payment_webhook_invalid_plan",
  "payment_activation_blocked_admin_granted",
  "payment_activation_failed",
  "subscription_activated",
  "subscription_entered_grace_period",
  "subscription_expired",
  "subscription_revoked",
  "subscription_admin_activated",
  "subscription_admin_extended",
] as const;

export type PlatformTransactionAuditAction =
  (typeof PLATFORM_TRANSACTION_AUDIT_ACTIONS)[number];
