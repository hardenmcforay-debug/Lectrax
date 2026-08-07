export const FREE_LIMITS = {
  MAX_ACTIVE_CLASS_SESSIONS: 2,
  MAX_STUDENTS_PER_SESSION: 50,
  MAX_TESTS: 1,
  MAX_ASSIGNMENTS: 1,
} as const;

export const GRACE_PERIOD_DAYS = 5;

export const EXPIRY_REMINDER_DAYS = [14, 7, 3, 1] as const;

/** Keyset page size for daily subscription lifecycle cron batches. */
export const SUBSCRIPTION_CRON_PAGE_SIZE = 100;

export const ADMIN_GRANTED_SUBSCRIBE_BLOCKED_MESSAGE =
  "Your Premium plan was activated by the platform administrator. You can subscribe once this plan ends or the administrator removes it.";

export const ACTIVE_SUBSCRIPTION_SUBSCRIBE_BLOCKED_MESSAGE =
  "You already have an active Premium subscription. You can subscribe again once your current plan ends.";

export function getAdminActivateBlockedMessage(endDate: string | null): string {
  const formatted = endDate
    ? new Date(endDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : "the end of the current period";
  return `This lecturer has an active subscription until ${formatted}. A free premium plan cannot be activated until the current subscription period ends.`;
}

export const STUDENT_SUBMISSIONS_DISABLED_MESSAGE =
  "Online assignment submission is not available for this class.";

export const BILLING_PLANS = {
  monthly: {
    price: 5,
    days: 30,
    label: "Monthly",
    description: "1 month of Premium",
  },
  semester: {
    price: 20,
    days: 120,
    label: "Semester",
    description: "4 months of Premium",
  },
  annual: {
    price: 45,
    days: 300,
    label: "Academic year",
    description: "10 months of Premium",
  },
} as const;

export type BillingPlan = keyof typeof BILLING_PLANS;

/**
 * Maps checkout billing plans to legacy `subscriptions.plan` enum values.
 * Annual billing maps to `10_months` (300 days).
 */
export function billingPlanToSubscriptionPlan(
  billingPlan: BillingPlan
): "1_month" | "3_months" | "10_months" {
  const map = {
    monthly: "1_month",
    semester: "3_months",
    annual: "10_months",
  } as const;
  return map[billingPlan];
}
export type SubscriptionTier = "free" | "premium";
export type SubscriptionLifecycleStatus = "active" | "grace_period" | "expired";

export const SUBSCRIPTION_TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "Free",
  premium: "Premium",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionLifecycleStatus, string> = {
  active: "Active",
  grace_period: "Grace Period",
  expired: "Expired",
};
