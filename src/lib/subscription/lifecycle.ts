import { createServiceClient } from "@/lib/supabase/server";
import {
  ACTIVE_SUBSCRIPTION_SUBSCRIBE_BLOCKED_MESSAGE,
  BILLING_PLANS,
  billingPlanToSubscriptionPlan,
  getAdminActivateBlockedMessage,
  GRACE_PERIOD_DAYS,
  EXPIRY_REMINDER_DAYS,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_TIER_LABELS,
  type BillingPlan,
  type SubscriptionLifecycleStatus,
  type SubscriptionTier,
} from "@/lib/subscription/constants";
import type { SubscriptionStatus } from "@/types/database";
import type { LecturerSubscription, SubscriptionDisplay } from "@/lib/subscription/types";
import { logAudit } from "@/lib/audit";

type ProfileSubscriptionRow = {
  id: string;
  subscription_plan: SubscriptionTier;
  subscription_status: SubscriptionLifecycleStatus;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  grace_period_end_date: string | null;
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function getBillingExpiryDate(plan: BillingPlan, from = new Date()): Date {
  return addDays(from, BILLING_PLANS[plan].days);
}

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

function mapLifecycleStatusToHistoryStatus(
  status: SubscriptionLifecycleStatus
): SubscriptionStatus {
  if (status === "grace_period") return "grace_period";
  if (status === "expired") return "expired";
  return "active";
}

async function recordSubscriptionNotification(params: {
  lecturerId: string;
  subscriptionEndDate: string;
  daysBeforeExpiry: number;
  message: string;
  service: ServiceClient;
}): Promise<void> {
  const { error } = await params.service.from("subscription_notifications").insert({
    lecturer_id: params.lecturerId,
    subscription_end_date: params.subscriptionEndDate,
    days_before_expiry: params.daysBeforeExpiry,
    message: params.message,
  });

  if (error && error.code !== "23505") {
    console.error("subscription_notification_insert_failed", error.message);
  }
}

async function recordSubscriptionActivatedNotification(params: {
  lecturerId: string;
  billingPlan: BillingPlan;
  subscriptionEndDate: string;
  service: ServiceClient;
}): Promise<void> {
  const planLabel = BILLING_PLANS[params.billingPlan].label;
  const expiryLabel = new Date(params.subscriptionEndDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  await recordSubscriptionNotification({
    lecturerId: params.lecturerId,
    subscriptionEndDate: params.subscriptionEndDate,
    daysBeforeExpiry: 0,
    message: `Your Lectrax Premium ${planLabel} subscription is now active through ${expiryLabel}.`,
    service: params.service,
  });
}

export function mapProfileToSubscription(row: ProfileSubscriptionRow): LecturerSubscription {
  return {
    lecturerId: row.id,
    plan: row.subscription_plan,
    status: row.subscription_status,
    subscriptionStartDate: row.subscription_start_date,
    subscriptionEndDate: row.subscription_end_date,
    gracePeriodEndDate: row.grace_period_end_date,
  };
}

export async function getLecturerSubscription(
  lecturerId: string,
  service?: Awaited<ReturnType<typeof createServiceClient>>
): Promise<LecturerSubscription | null> {
  const supabase = service ?? (await createServiceClient());
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, subscription_plan, subscription_status, subscription_start_date, subscription_end_date, grace_period_end_date"
    )
    .eq("id", lecturerId)
    .eq("role", "lecturer")
    .maybeSingle();

  if (!data) return null;
  return mapProfileToSubscription(data as ProfileSubscriptionRow);
}

export function isSubscriptionWritable(sub: LecturerSubscription | null): boolean {
  if (!sub) return false;
  if (sub.plan === "free" && sub.status === "active") return true;
  if (sub.plan !== "premium") return false;
  if (sub.status === "active") {
    if (!sub.subscriptionEndDate) return true;
    return new Date(sub.subscriptionEndDate) > new Date();
  }
  if (sub.status === "grace_period") {
    if (!sub.gracePeriodEndDate) return false;
    return new Date(sub.gracePeriodEndDate) > new Date();
  }
  return false;
}

export function isPremiumFeatureUnlocked(sub: LecturerSubscription | null): boolean {
  if (!sub) return false;
  if (sub.plan === "premium" && (sub.status === "active" || sub.status === "grace_period")) {
    if (sub.status === "grace_period") {
      return sub.gracePeriodEndDate ? new Date(sub.gracePeriodEndDate) > new Date() : false;
    }
    if (!sub.subscriptionEndDate) return true;
    return new Date(sub.subscriptionEndDate) > new Date();
  }
  return false;
}

/** True while premium is active and the paid period has not yet ended. */
export function hasActiveSubscriptionPeriod(sub: LecturerSubscription | null): boolean {
  if (!sub || sub.plan !== "premium" || sub.status !== "active") return false;
  if (!sub.subscriptionEndDate) return true;
  return new Date(sub.subscriptionEndDate) > new Date();
}

export function isReadOnlySubscription(sub: LecturerSubscription | null): boolean {
  if (!sub) return true;
  if (sub.plan === "free" && sub.status === "active") return false;
  if (sub.plan === "premium" && sub.status === "expired") return true;
  if (sub.plan === "premium" && sub.status === "grace_period") {
    if (!sub.gracePeriodEndDate) return true;
    return new Date(sub.gracePeriodEndDate) <= new Date();
  }
  if (sub.plan === "premium" && sub.status === "active" && sub.subscriptionEndDate) {
    return new Date(sub.subscriptionEndDate) <= new Date();
  }
  return false;
}

/** True when premium is active and was granted by a platform admin (not self-paid). */
export async function isAdminGrantedPremiumActive(
  lecturerId: string,
  profileSub: LecturerSubscription | null,
  service?: Awaited<ReturnType<typeof createServiceClient>>
): Promise<boolean> {
  if (!profileSub || profileSub.plan !== "premium" || profileSub.status !== "active") {
    return false;
  }
  if (profileSub.subscriptionEndDate && new Date(profileSub.subscriptionEndDate) <= new Date()) {
    return false;
  }

  const supabase = service ?? (await createServiceClient());
  const { data } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("lecturer_id", lecturerId)
    .eq("is_free_override", true)
    .not("granted_by", "is", null)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return !!data;
}

export async function canLecturerSelfSubscribe(
  lecturerId: string,
  service?: Awaited<ReturnType<typeof createServiceClient>>
): Promise<{ allowed: boolean; subscription: LecturerSubscription | null }> {
  const supabase = service ?? (await createServiceClient());
  const subscription = await refreshSubscriptionLifecycle(lecturerId, supabase);
  return { allowed: !hasActiveSubscriptionPeriod(subscription), subscription };
}

export async function getSubscriptionDisplayForLecturer(lecturerId: string): Promise<{
  subscription: LecturerSubscription | null;
  display: SubscriptionDisplay;
}> {
  const supabase = await createServiceClient();
  let subscription = await refreshSubscriptionLifecycle(lecturerId, supabase);

  if (subscription?.plan === "premium" && subscription.subscriptionEndDate) {
    const { data: history } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("lecturer_id", lecturerId)
      .eq("expires_at", subscription.subscriptionEndDate)
      .limit(1)
      .maybeSingle();

    if (!history) {
      await backfillMissingSubscriptionRecords(supabase);
      subscription = await refreshSubscriptionLifecycle(lecturerId, supabase);
    }
  }

  const isAdminGranted = await isAdminGrantedPremiumActive(lecturerId, subscription, supabase);
  return {
    subscription,
    display: buildSubscriptionDisplay(subscription, { isAdminGranted }),
  };
}

export function buildSubscriptionDisplay(
  sub: LecturerSubscription | null,
  options?: { isAdminGranted?: boolean }
): SubscriptionDisplay {
  const now = new Date();
  const plan = sub?.plan ?? "free";
  const status = sub?.status ?? "active";
  const isPremium = plan === "premium";
  const isFree = plan === "free";
  const isAdminGranted = options?.isAdminGranted ?? false;
  const canSelfSubscribe = !hasActiveSubscriptionPeriod(sub);
  const canWrite = isSubscriptionWritable(sub);
  const isReadOnly = isReadOnlySubscription(sub);

  let daysRemaining: number | null = null;
  let graceDaysRemaining: number | null = null;

  if (isPremium && sub?.subscriptionEndDate && status === "active") {
    daysRemaining = daysBetween(now, new Date(sub.subscriptionEndDate));
  }

  if (isPremium && status === "grace_period" && sub?.gracePeriodEndDate) {
    graceDaysRemaining = daysBetween(now, new Date(sub.gracePeriodEndDate));
  }

  let showExpiryReminder = false;
  let expiryReminderMessage: string | null = null;

  if (isPremium && status === "active" && sub?.subscriptionEndDate && !isAdminGranted) {
    const end = new Date(sub.subscriptionEndDate);
    const daysLeft = daysBetween(now, end);
    const match = EXPIRY_REMINDER_DAYS.find((d) => daysLeft === d);
    if (match) {
      showExpiryReminder = true;
      expiryReminderMessage = `Your Lectrax subscription will expire in ${match} day${match === 1 ? "" : "s"}. You can renew once your current plan ends.`;
    }
  }

  return {
    planLabel: SUBSCRIPTION_TIER_LABELS[plan],
    statusLabel: SUBSCRIPTION_STATUS_LABELS[status],
    expiryDate: sub?.subscriptionEndDate ?? null,
    subscriptionStartDate: sub?.subscriptionStartDate ?? null,
    daysRemaining,
    graceDaysRemaining,
    isReadOnly,
    isPremium,
    isFree,
    canWrite,
    showGraceBanner: isPremium && status === "grace_period" && !isReadOnly,
    showExpiredBanner: isReadOnly && isPremium,
    showExpiryReminder,
    expiryReminderMessage,
    isAdminGranted,
    canSelfSubscribe,
  };
}

export async function refreshSubscriptionLifecycle(
  lecturerId: string,
  service?: Awaited<ReturnType<typeof createServiceClient>>
): Promise<LecturerSubscription | null> {
  const supabase = service ?? (await createServiceClient());
  const sub = await getLecturerSubscription(lecturerId, supabase);
  if (!sub || sub.plan !== "premium") return sub;

  const now = new Date();
  const updates: Partial<ProfileSubscriptionRow> = {};

  if (
    sub.status === "active" &&
    sub.subscriptionEndDate &&
    new Date(sub.subscriptionEndDate) <= now
  ) {
    const graceEnd = addDays(new Date(sub.subscriptionEndDate), GRACE_PERIOD_DAYS);
    updates.subscription_status = "grace_period";
    updates.grace_period_end_date = graceEnd.toISOString();

    void logAudit({
      action: "subscription_entered_grace_period",
      entityType: "profile",
      entityId: lecturerId,
      metadata: {
        subscription_end_date: sub.subscriptionEndDate,
        grace_period_end_date: graceEnd.toISOString(),
      },
    });
  } else if (
    sub.status === "grace_period" &&
    sub.gracePeriodEndDate &&
    new Date(sub.gracePeriodEndDate) <= now
  ) {
    updates.subscription_status = "expired";

    void logAudit({
      action: "subscription_expired",
      entityType: "profile",
      entityId: lecturerId,
      metadata: { grace_period_end_date: sub.gracePeriodEndDate },
    });
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("profiles").update(updates).eq("id", lecturerId);
    return getLecturerSubscription(lecturerId, supabase);
  }

  return sub;
}

export async function processExpiryReminders(
  service?: Awaited<ReturnType<typeof createServiceClient>>
): Promise<number> {
  const supabase = service ?? (await createServiceClient());
  const now = new Date();
  let sent = 0;

  const { data: lecturers } = await supabase
    .from("profiles")
    .select(
      "id, subscription_plan, subscription_status, subscription_end_date"
    )
    .eq("role", "lecturer")
    .eq("subscription_plan", "premium")
    .eq("subscription_status", "active")
    .not("subscription_end_date", "is", null);

  for (const lecturer of lecturers ?? []) {
    if (!lecturer.subscription_end_date) continue;
    const end = new Date(lecturer.subscription_end_date);
    const daysLeft = daysBetween(now, end);

    if (!EXPIRY_REMINDER_DAYS.includes(daysLeft as (typeof EXPIRY_REMINDER_DAYS)[number])) {
      continue;
    }

    const message = `Your Lectrax subscription will expire in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. You can renew once your current plan ends.`;

    const { error } = await supabase.from("subscription_notifications").insert({
      lecturer_id: lecturer.id,
      subscription_end_date: lecturer.subscription_end_date,
      days_before_expiry: daysLeft,
      message,
    });

    if (error) {
      if (error.code !== "23505") {
        console.error("expiry_reminder_insert_failed", lecturer.id, error.message);
      }
      continue;
    }

    sent += 1;
  }

  return sent;
}

export async function activatePremiumSubscription(params: {
  lecturerId: string;
  billingPlan: BillingPlan;
  paymentId: string;
  transactionReference?: string | null;
  grantedBy?: string | null;
  service?: Awaited<ReturnType<typeof createServiceClient>>;
}): Promise<LecturerSubscription> {
  const supabase = params.service ?? (await createServiceClient());
  const existing = await getLecturerSubscription(params.lecturerId, supabase);
  const refreshed = await refreshSubscriptionLifecycle(params.lecturerId, supabase);

  if (hasActiveSubscriptionPeriod(refreshed)) {
    throw new Error(ACTIVE_SUBSCRIPTION_SUBSCRIBE_BLOCKED_MESSAGE);
  }

  const now = new Date();
  const startDate = now;
  const endDate = getBillingExpiryDate(params.billingPlan, startDate);
  const subscriptionStartDate =
    existing?.subscriptionStartDate && existing.plan === "premium"
      ? existing.subscriptionStartDate
      : now.toISOString();
  const historyPlan = billingPlanToSubscriptionPlan(params.billingPlan);

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .insert({
      lecturer_id: params.lecturerId,
      plan: historyPlan,
      status: "active",
      starts_at: startDate.toISOString(),
      expires_at: endDate.toISOString(),
      is_free_override: false,
      granted_by: params.grantedBy ?? null,
    })
    .select("id")
    .single();

  if (subscriptionError || !subscription) {
    throw new Error(
      `Failed to create subscription record: ${subscriptionError?.message ?? "unknown error"}`
    );
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      subscription_plan: "premium",
      subscription_status: "active",
      subscription_start_date: subscriptionStartDate,
      subscription_end_date: endDate.toISOString(),
      grace_period_end_date: null,
    })
    .eq("id", params.lecturerId);

  if (profileError) {
    await supabase.from("subscriptions").delete().eq("id", subscription.id);
    throw new Error(`Failed to update lecturer profile: ${profileError.message}`);
  }

  const { error: paymentError } = await supabase
    .from("payments")
    .update({
      status: "completed",
      paid_at: now.toISOString(),
      subscription_id: subscription.id,
      payment_provider: "MONIME",
      transaction_reference: params.transactionReference ?? null,
      billing_plan: params.billingPlan,
      subscription_start_date: startDate.toISOString(),
      subscription_end_date: endDate.toISOString(),
      payment_method: "monime",
    })
    .eq("id", params.paymentId);

  if (paymentError) {
    throw new Error(`Failed to update payment record: ${paymentError.message}`);
  }

  await recordSubscriptionActivatedNotification({
    lecturerId: params.lecturerId,
    billingPlan: params.billingPlan,
    subscriptionEndDate: endDate.toISOString(),
    service: supabase,
  });

  void logAudit({
    action: "subscription_activated",
    entityType: "payment",
    entityId: params.paymentId,
    metadata: {
      lecturer_id: params.lecturerId,
      billing_plan: params.billingPlan,
      subscription_end_date: endDate.toISOString(),
      transaction_reference: params.transactionReference,
    },
  });

  const updated = await getLecturerSubscription(params.lecturerId, supabase);
  if (!updated) {
    throw new Error("Failed to load subscription after activation");
  }
  return updated;
}

export async function revokePremiumSubscription(
  lecturerId: string,
  actorId: string,
  service?: Awaited<ReturnType<typeof createServiceClient>>
): Promise<void> {
  const supabase = service ?? (await createServiceClient());
  await supabase
    .from("profiles")
    .update({
      subscription_plan: "free",
      subscription_status: "active",
      subscription_start_date: null,
      subscription_end_date: null,
      grace_period_end_date: null,
    })
    .eq("id", lecturerId);

  await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("lecturer_id", lecturerId)
    .eq("is_free_override", true)
    .eq("status", "active");

  void logAudit({
    action: "subscription_revoked",
    entityType: "profile",
    entityId: lecturerId,
    metadata: { reverted_to: "free", actor_id: actorId },
  });
}

export async function adminActivatePremium(params: {
  lecturerId: string;
  billingPlan: BillingPlan;
  actorId: string;
  service?: Awaited<ReturnType<typeof createServiceClient>>;
}): Promise<LecturerSubscription> {
  const supabase = params.service ?? (await createServiceClient());
  const sub = await refreshSubscriptionLifecycle(params.lecturerId, supabase);

  if (hasActiveSubscriptionPeriod(sub)) {
    throw new Error(getAdminActivateBlockedMessage(sub?.subscriptionEndDate ?? null));
  }

  const now = new Date();
  const endDate = getBillingExpiryDate(params.billingPlan, now);

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .insert({
      lecturer_id: params.lecturerId,
      plan: "free",
      status: "active",
      starts_at: now.toISOString(),
      expires_at: endDate.toISOString(),
      is_free_override: true,
      granted_by: params.actorId,
    })
    .select("id")
    .single();

  if (subscriptionError || !subscription) {
    throw new Error(
      `Failed to create subscription record: ${subscriptionError?.message ?? "unknown error"}`
    );
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      subscription_plan: "premium",
      subscription_status: "active",
      subscription_start_date: now.toISOString(),
      subscription_end_date: endDate.toISOString(),
      grace_period_end_date: null,
    })
    .eq("id", params.lecturerId);

  if (profileError) {
    await supabase.from("subscriptions").delete().eq("id", subscription.id);
    throw new Error(`Failed to update lecturer profile: ${profileError.message}`);
  }

  await recordSubscriptionNotification({
    lecturerId: params.lecturerId,
    subscriptionEndDate: endDate.toISOString(),
    daysBeforeExpiry: 0,
    message: `A platform administrator activated your Lectrax Premium ${BILLING_PLANS[params.billingPlan].label} plan through ${endDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}.`,
    service: supabase,
  });

  void logAudit({
    action: "subscription_admin_activated",
    entityType: "profile",
    entityId: params.lecturerId,
    metadata: {
      billing_plan: params.billingPlan,
      expires_at: endDate.toISOString(),
      actor_id: params.actorId,
    },
  });

  const updated = await getLecturerSubscription(params.lecturerId, supabase);
  if (!updated) throw new Error("Failed to load subscription");
  return updated;
}

export async function adminExtendPremium(params: {
  lecturerId: string;
  days: number;
  actorId: string;
  service?: Awaited<ReturnType<typeof createServiceClient>>;
}): Promise<LecturerSubscription> {
  const supabase = params.service ?? (await createServiceClient());
  const sub = await refreshSubscriptionLifecycle(params.lecturerId, supabase);
  if (!sub) throw new Error("Lecturer not found");

  const now = new Date();
  const base =
    sub.subscriptionEndDate && new Date(sub.subscriptionEndDate) > now
      ? new Date(sub.subscriptionEndDate)
      : now;
  const newEnd = addDays(base, params.days);

  await supabase
    .from("profiles")
    .update({
      subscription_plan: "premium",
      subscription_status: "active",
      subscription_end_date: newEnd.toISOString(),
      grace_period_end_date: null,
    })
    .eq("id", params.lecturerId);

  await supabase
    .from("subscriptions")
    .update({ expires_at: newEnd.toISOString(), status: "active" })
    .eq("lecturer_id", params.lecturerId)
    .eq("is_free_override", true)
    .eq("status", "active");

  void logAudit({
    action: "subscription_admin_extended",
    entityType: "profile",
    entityId: params.lecturerId,
    metadata: { days: params.days, new_end_date: newEnd.toISOString(), actor_id: params.actorId },
  });

  const updated = await getLecturerSubscription(params.lecturerId, supabase);
  if (!updated) throw new Error("Failed to load subscription");
  return updated;
}

/**
 * Repairs lecturers who have premium on their profile but no matching `subscriptions` row
 * (e.g. from earlier activations that updated the profile before history insert failed).
 */
export async function backfillMissingSubscriptionRecords(
  service?: ServiceClient
): Promise<number> {
  const supabase = service ?? (await createServiceClient());

  const { data: lecturers } = await supabase
    .from("profiles")
    .select(
      "id, subscription_plan, subscription_status, subscription_start_date, subscription_end_date"
    )
    .eq("role", "lecturer")
    .eq("subscription_plan", "premium");

  let created = 0;

  for (const lecturer of lecturers ?? []) {
    if (!lecturer.subscription_end_date) continue;

    const { data: existingHistory } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("lecturer_id", lecturer.id)
      .eq("expires_at", lecturer.subscription_end_date)
      .limit(1)
      .maybeSingle();

    if (existingHistory) continue;

    const { data: payment } = await supabase
      .from("payments")
      .select("id, billing_plan, subscription_start_date, subscription_end_date, paid_at, subscription_id")
      .eq("lecturer_id", lecturer.id)
      .eq("status", "completed")
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const billingPlan = (payment?.billing_plan ?? "annual") as BillingPlan;
    const historyPlan = payment ? billingPlanToSubscriptionPlan(billingPlan) : "free";
    const startsAt =
      lecturer.subscription_start_date ??
      payment?.subscription_start_date ??
      payment?.paid_at ??
      new Date().toISOString();

    const { data: inserted, error } = await supabase
      .from("subscriptions")
      .insert({
        lecturer_id: lecturer.id,
        plan: historyPlan,
        status: mapLifecycleStatusToHistoryStatus(
          lecturer.subscription_status as SubscriptionLifecycleStatus
        ),
        starts_at: startsAt,
        expires_at: lecturer.subscription_end_date,
        is_free_override: !payment,
        granted_by: null,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      console.error("subscription_backfill_insert_failed", lecturer.id, error?.message);
      continue;
    }

    if (payment && !payment.subscription_id) {
      await supabase
        .from("payments")
        .update({ subscription_id: inserted.id })
        .eq("id", payment.id);
    }

    await recordSubscriptionNotification({
      lecturerId: lecturer.id,
      subscriptionEndDate: lecturer.subscription_end_date,
      daysBeforeExpiry: 0,
      message: payment
        ? `Your Lectrax Premium subscription record was restored. Access continues through ${new Date(lecturer.subscription_end_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}.`
        : `Your Lectrax Premium subscription record was restored.`,
      service: supabase,
    });

    created += 1;
  }

  return created;
}
