import { createClient } from "@/lib/supabase/server";
import { getSubscriptionDisplayForLecturer } from "@/lib/subscription";
import type { SubscriptionDisplay } from "@/lib/subscription/types";
import type { Payment } from "@/types/database";

export type SubscriptionPageProfile = {
  subscription_plan: string;
  subscription_status: string;
  subscription_end_date: string | null;
  grace_period_end_date: string | null;
};

export type SubscriptionPageInitialData = {
  profile: SubscriptionPageProfile | null;
  display: SubscriptionDisplay;
  payments: Payment[];
};

export async function getSubscriptionPageInitialData(
  lecturerId: string
): Promise<SubscriptionPageInitialData> {
  const supabase = await createClient();
  const [{ subscription, display }, paymentsResult] = await Promise.all([
    getSubscriptionDisplayForLecturer(lecturerId),
    supabase
      .from("payments")
      .select(
        "id, amount, status, plan, billing_plan, created_at, paid_at, metadata, monime_payment_id, lecturer_id"
      )
      .eq("lecturer_id", lecturerId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const profile = subscription
    ? {
        subscription_plan: subscription.plan,
        subscription_status: subscription.status,
        subscription_end_date: subscription.subscriptionEndDate,
        grace_period_end_date: subscription.gracePeriodEndDate,
      }
    : null;

  return {
    profile,
    display,
    payments: (paymentsResult.data as Payment[]) ?? [],
  };
}
