import type {
  BillingPlan,
  SubscriptionLifecycleStatus,
  SubscriptionTier,
} from "@/lib/subscription/constants";

export interface LecturerSubscription {
  lecturerId: string;
  plan: SubscriptionTier;
  status: SubscriptionLifecycleStatus;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  gracePeriodEndDate: string | null;
}

export interface SubscriptionDisplay {
  planLabel: string;
  statusLabel: string;
  expiryDate: string | null;
  subscriptionStartDate: string | null;
  daysRemaining: number | null;
  graceDaysRemaining: number | null;
  isReadOnly: boolean;
  isPremium: boolean;
  isFree: boolean;
  canWrite: boolean;
  showGraceBanner: boolean;
  showExpiredBanner: boolean;
  showExpiryReminder: boolean;
  expiryReminderMessage: string | null;
  /** Premium was activated by a platform admin (not self-paid). */
  isAdminGranted: boolean;
  /** Whether the lecturer can purchase or renew via checkout. */
  canSelfSubscribe: boolean;
}

export interface BillingPlanOption {
  id: BillingPlan;
  label: string;
  description: string;
  price: number;
  days: number;
}
