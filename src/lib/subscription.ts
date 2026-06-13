export {
  FREE_LIMITS,
  GRACE_PERIOD_DAYS,
  EXPIRY_REMINDER_DAYS,
  BILLING_PLANS,
  SUBSCRIPTION_TIER_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  ADMIN_GRANTED_SUBSCRIBE_BLOCKED_MESSAGE,
  ACTIVE_SUBSCRIPTION_SUBSCRIBE_BLOCKED_MESSAGE,
  getAdminActivateBlockedMessage,
  billingPlanToSubscriptionPlan,
  type BillingPlan,
  type SubscriptionTier,
  type SubscriptionLifecycleStatus,
} from "@/lib/subscription/constants";

export type { LecturerSubscription, SubscriptionDisplay } from "@/lib/subscription/types";

import {
  getBillingExpiryDate,
  isPremiumFeatureUnlocked,
  isSubscriptionWritable,
  getLecturerSubscription,
  isReadOnlySubscription,
  buildSubscriptionDisplay,
  refreshSubscriptionLifecycle,
  processExpiryReminders,
  activatePremiumSubscription,
  revokePremiumSubscription,
  adminActivatePremium,
  adminExtendPremium,
  isAdminGrantedPremiumActive,
  hasActiveSubscriptionPeriod,
  canLecturerSelfSubscribe,
  getSubscriptionDisplayForLecturer,
  backfillMissingSubscriptionRecords,
} from "@/lib/subscription/lifecycle";

export {
  getBillingExpiryDate,
  isPremiumFeatureUnlocked,
  isSubscriptionWritable,
  getLecturerSubscription,
  isReadOnlySubscription,
  hasActiveSubscriptionPeriod,
  buildSubscriptionDisplay,
  refreshSubscriptionLifecycle,
  processExpiryReminders,
  activatePremiumSubscription,
  revokePremiumSubscription,
  adminActivatePremium,
  adminExtendPremium,
  isAdminGrantedPremiumActive,
  canLecturerSelfSubscribe,
  getSubscriptionDisplayForLecturer,
  backfillMissingSubscriptionRecords,
};

export {
  requireWritableSubscription,
  requirePremiumFeature,
  requireSelfSubscribeAllowed,
  checkFreePlanLimit,
  subscriptionGuardResponse,
  type SubscriptionGuardResult,
} from "@/lib/subscription/guards";

/** @deprecated Use isPremiumFeatureUnlocked or isSubscriptionWritable */
export function isSubscriptionActive(sub?: {
  status?: string;
  expires_at?: string;
} | null): boolean {
  if (!sub) return false;
  if (sub.status === "active" || sub.status === "free") {
    return sub.expires_at ? new Date(sub.expires_at) > new Date() : true;
  }
  return false;
}

/** @deprecated Use getBillingExpiryDate */
export function getExpiryDate(plan: string, from = new Date()): Date {
  if (plan === "monthly" || plan === "semester" || plan === "annual") {
    return getBillingExpiryDate(plan, from);
  }
  const d = new Date(from);
  d.setDate(d.getDate() + 30);
  return d;
}
