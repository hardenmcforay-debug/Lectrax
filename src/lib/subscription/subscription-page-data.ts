import { createClient } from "@/lib/supabase/server";
import { getSubscriptionDisplayForLecturer } from "@/lib/subscription";
import type { SubscriptionDisplay } from "@/lib/subscription/types";
import type { Payment } from "@/types/database";
import {
  getPaymentMethodLogoUrls,
} from "@/lib/subscription/payment-method-logos";
import type { PaymentMethodLogoId } from "@/lib/subscription/payment-method-logo-ids";

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
  paymentMethodLogos: Record<PaymentMethodLogoId, string | null>;
};

export async function getSubscriptionPageInitialData(
  lecturerId: string
): Promise<SubscriptionPageInitialData> {
  const supabase = await createClient();
  const [{ subscription, display }, paymentsResult, paymentMethodLogos] = await Promise.all([
    getSubscriptionDisplayForLecturer(lecturerId),
    supabase
      .from("payments")
      .select(
        "id, amount, status, plan, billing_plan, created_at, paid_at, metadata, monime_payment_id, lecturer_id"
      )
      .eq("lecturer_id", lecturerId)
      .order("created_at", { ascending: false })
      .limit(10),
    getPaymentMethodLogoUrls(),
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
    paymentMethodLogos,
  };
}
