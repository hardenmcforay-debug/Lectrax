import { FREE_LIMITS, type SubscriptionTier } from "@/lib/subscription/constants";

/** Maximum assignments per class session for Premium lecturers. */
export const MAX_ASSIGNMENTS_PER_SESSION = 2;

export function getAssignmentCreationLimit(plan: SubscriptionTier): number {
  return plan === "free" ? FREE_LIMITS.MAX_ASSIGNMENTS : MAX_ASSIGNMENTS_PER_SESSION;
}

export function canCreateAssignment(plan: SubscriptionTier, currentCount: number): boolean {
  return currentCount < getAssignmentCreationLimit(plan);
}

export function getAssignmentLimitReachedMessage(plan: SubscriptionTier): string {
  if (plan === "free") {
    return `You have reached your assignment limit. The Free plan allows ${FREE_LIMITS.MAX_ASSIGNMENTS} assignment per class. Upgrade to Premium to create up to ${MAX_ASSIGNMENTS_PER_SESSION} assignments.`;
  }
  return `You have reached your assignment limit. Each class session allows up to ${MAX_ASSIGNMENTS_PER_SESSION} assignments.`;
}
