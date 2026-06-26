import type { BillingPlan } from "@/types/database";
import type { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

export type PaymentActivationClaimResult =
  | { kind: "claimed"; paymentId: string; lecturerId: string; billingPlan: BillingPlan | null }
  | { kind: "already_completed"; paymentId: string }
  | { kind: "in_progress"; paymentId: string }
  | { kind: "not_claimable"; paymentId: string }
  | { kind: "not_found"; paymentId: string };

export async function claimPaymentForActivation(
  paymentId: string,
  service: ServiceClient
): Promise<PaymentActivationClaimResult> {
  const { data, error } = await service.rpc("claim_payment_for_activation", {
    p_payment_id: paymentId,
  });

  if (error) {
    throw new Error(`Failed to claim payment for activation: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { kind: "not_found", paymentId };
  }

  if (row.already_completed) {
    return { kind: "already_completed", paymentId };
  }

  if (row.claimed) {
    return {
      kind: "claimed",
      paymentId,
      lecturerId: row.lecturer_id as string,
      billingPlan: (row.billing_plan as BillingPlan | null) ?? null,
    };
  }

  if (row.current_status === "processing") {
    return { kind: "in_progress", paymentId };
  }

  return { kind: "not_claimable", paymentId };
}

export async function releasePaymentActivationClaim(
  paymentId: string,
  service: ServiceClient
): Promise<void> {
  const { error } = await service.rpc("release_payment_activation_claim", {
    p_payment_id: paymentId,
  });

  if (error) {
    console.error("release_payment_activation_claim_failed", paymentId, error.message);
  }
}
