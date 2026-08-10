import { FREE_LIMITS, type SubscriptionTier } from "@/lib/subscription/constants";

/** Maximum tests per class session for Premium lecturers. */
export const MAX_TESTS_PER_SESSION = 2;

export function getTestCreationLimit(plan: SubscriptionTier): number {
  return plan === "free" ? FREE_LIMITS.MAX_TESTS : MAX_TESTS_PER_SESSION;
}

export function canCreateTest(plan: SubscriptionTier, currentCount: number): boolean {
  return currentCount < getTestCreationLimit(plan);
}

export function getTestLimitReachedMessage(plan: SubscriptionTier): string {
  if (plan === "free") {
    return `You have reached your test limit. The Free plan allows ${FREE_LIMITS.MAX_TESTS} test per class. Upgrade to Premium to create up to ${MAX_TESTS_PER_SESSION} tests.`;
  }
  return `You have reached your test limit. Each class session allows up to ${MAX_TESTS_PER_SESSION} tests.`;
}
