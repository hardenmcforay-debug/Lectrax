import { createServiceClient } from "@/lib/supabase/server";
import {
  getAssignmentCreationLimit,
  getAssignmentLimitReachedMessage,
} from "@/lib/lecturer/assignment-limits";
import {
  ACTIVE_SUBSCRIPTION_SUBSCRIBE_BLOCKED_MESSAGE,
  ADMIN_GRANTED_SUBSCRIBE_BLOCKED_MESSAGE,
  FREE_LIMITS,
  STUDENT_SUBMISSIONS_DISABLED_MESSAGE,
} from "@/lib/subscription/constants";
import {
  hasActiveSubscriptionPeriod,
  isAdminGrantedPremiumActive,
  isPremiumFeatureUnlocked,
  isSubscriptionWritable,
  refreshSubscriptionLifecycle,
} from "@/lib/subscription/lifecycle";
import type { LecturerSubscription } from "@/lib/subscription/types";

export type SubscriptionGuardResult =
  | { ok: true; subscription: LecturerSubscription }
  | { ok: false; error: string; code: string };

export async function requireWritableSubscription(
  lecturerId: string
): Promise<SubscriptionGuardResult> {
  const service = await createServiceClient();
  const subscription = await refreshSubscriptionLifecycle(lecturerId, service);

  if (!subscription) {
    return { ok: false, error: "Lecturer profile not found", code: "NOT_LECTURER" };
  }

  if (!isSubscriptionWritable(subscription)) {
    return {
      ok: false,
      error: "Your subscription has expired. Renew your plan to continue using Lectrax.",
      code: "SUBSCRIPTION_READ_ONLY",
    };
  }

  return { ok: true, subscription };
}

export async function requireSelfSubscribeAllowed(
  lecturerId: string
): Promise<SubscriptionGuardResult> {
  const service = await createServiceClient();
  const subscription = await refreshSubscriptionLifecycle(lecturerId, service);

  if (!subscription) {
    return { ok: false, error: "Lecturer profile not found", code: "NOT_LECTURER" };
  }

  if (hasActiveSubscriptionPeriod(subscription)) {
    const adminGranted = await isAdminGrantedPremiumActive(lecturerId, subscription, service);
    return {
      ok: false,
      error: adminGranted
        ? ADMIN_GRANTED_SUBSCRIBE_BLOCKED_MESSAGE
        : ACTIVE_SUBSCRIPTION_SUBSCRIBE_BLOCKED_MESSAGE,
      code: adminGranted ? "ADMIN_GRANTED_PREMIUM" : "ACTIVE_SUBSCRIPTION_PERIOD",
    };
  }

  return { ok: true, subscription };
}

export async function requirePremiumFeature(
  lecturerId: string,
  feature: "analytics" | "audit_logs" | "student_submissions" | "unlimited_tests" | "unlimited_assignments"
): Promise<SubscriptionGuardResult> {
  const service = await createServiceClient();
  const subscription = await refreshSubscriptionLifecycle(lecturerId, service);

  if (!subscription) {
    return { ok: false, error: "Lecturer profile not found", code: "NOT_LECTURER" };
  }

  if (isPremiumFeatureUnlocked(subscription)) {
    return { ok: true, subscription };
  }

  const messages: Record<typeof feature, string> = {
    analytics: "Analytics is a Premium feature. Upgrade your plan to unlock analytics.",
    audit_logs: "Audit logs are a Premium feature. Upgrade your plan to unlock audit logs.",
    student_submissions: STUDENT_SUBMISSIONS_DISABLED_MESSAGE,
    unlimited_tests: `Free plan allows only ${FREE_LIMITS.MAX_TESTS} test. Upgrade to Premium for unlimited tests.`,
    unlimited_assignments: `Free plan allows only ${FREE_LIMITS.MAX_ASSIGNMENTS} assignment. Upgrade to Premium for unlimited assignments.`,
  };

  return { ok: false, error: messages[feature], code: "PREMIUM_REQUIRED" };
}

export async function checkFreePlanLimit(
  lecturerId: string,
  action: "create_session" | "add_student" | "create_test" | "create_assignment",
  context?: { classSessionId?: string }
): Promise<SubscriptionGuardResult> {
  const service = await createServiceClient();
  const subscription = await refreshSubscriptionLifecycle(lecturerId, service);

  if (!subscription) {
    return { ok: false, error: "Lecturer profile not found", code: "NOT_LECTURER" };
  }

  if (isPremiumFeatureUnlocked(subscription)) {
    return { ok: true, subscription };
  }

  if (subscription.plan !== "free") {
    return { ok: true, subscription };
  }

  if (action === "create_session") {
    const { count } = await service
      .from("class_sessions")
      .select("*", { count: "exact", head: true })
      .eq("lecturer_id", lecturerId)
      .eq("is_active", true);

    if ((count ?? 0) >= FREE_LIMITS.MAX_ACTIVE_CLASS_SESSIONS) {
      return {
        ok: false,
        error: `Free plan allows up to ${FREE_LIMITS.MAX_ACTIVE_CLASS_SESSIONS} active class sessions. Upgrade to Premium for unlimited sessions.`,
        code: "FREE_LIMIT_SESSIONS",
      };
    }
  }

  if (action === "add_student" && context?.classSessionId) {
    const { count } = await service
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("class_session_id", context.classSessionId);

    if ((count ?? 0) >= FREE_LIMITS.MAX_STUDENTS_PER_SESSION) {
      return {
        ok: false,
        error: `Free plan allows up to ${FREE_LIMITS.MAX_STUDENTS_PER_SESSION} students per class session. Upgrade to Premium for unlimited students.`,
        code: "FREE_LIMIT_STUDENTS",
      };
    }
  }

  if (action === "create_test" && context?.classSessionId) {
    const { count } = await service
      .from("class_tests")
      .select("*", { count: "exact", head: true })
      .eq("class_session_id", context.classSessionId);

    if ((count ?? 0) >= FREE_LIMITS.MAX_TESTS) {
      return {
        ok: false,
        error: `Free plan allows only ${FREE_LIMITS.MAX_TESTS} test. Upgrade to Premium for unlimited tests.`,
        code: "FREE_LIMIT_TESTS",
      };
    }
  }

  return { ok: true, subscription };
}

export async function checkAssignmentCreationLimit(
  lecturerId: string,
  classSessionId: string
): Promise<SubscriptionGuardResult> {
  const service = await createServiceClient();
  const subscription = await refreshSubscriptionLifecycle(lecturerId, service);

  if (!subscription) {
    return { ok: false, error: "Lecturer profile not found", code: "NOT_LECTURER" };
  }

  const assignmentLimit = getAssignmentCreationLimit(subscription.plan);
  const { count } = await service
    .from("assignments")
    .select("*", { count: "exact", head: true })
    .eq("class_session_id", classSessionId);

  if ((count ?? 0) >= assignmentLimit) {
    return {
      ok: false,
      error: getAssignmentLimitReachedMessage(subscription.plan),
      code: subscription.plan === "free" ? "FREE_LIMIT_ASSIGNMENTS" : "ASSIGNMENT_LIMIT_REACHED",
    };
  }

  return { ok: true, subscription };
}

export function subscriptionGuardResponse(result: Extract<SubscriptionGuardResult, { ok: false }>) {
  const status =
    result.code === "SUBSCRIPTION_READ_ONLY" || result.code.startsWith("FREE_LIMIT")
      ? 403
      : 403;
  return { error: result.error, code: result.code, status };
}
