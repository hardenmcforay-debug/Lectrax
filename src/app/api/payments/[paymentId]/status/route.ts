import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifyMonimePayment, verifyMonimePaymentCode } from "@/lib/monime";
import { activatePremiumSubscription, canLecturerSelfSubscribe, PaymentActivationInProgressError } from "@/lib/subscription/lifecycle";
import type { BillingPlan } from "@/types/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await createServiceClient();
  const { data: payment } = await service
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("lecturer_id", user.id)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.status === "completed") {
    return NextResponse.json({ status: "completed" });
  }

  if (payment.status === "processing") {
    return NextResponse.json({ status: "processing" });
  }

  const metadata = (payment.metadata ?? {}) as { monime_kind?: string };
  const monimeId = payment.monime_payment_id ?? payment.transaction_reference;

  if (monimeId) {
    const verified =
      metadata.monime_kind === "ussd"
        ? await verifyMonimePaymentCode(monimeId)
        : await verifyMonimePayment(monimeId);

    if (verified.completed && payment.billing_plan) {
      const { allowed } = await canLecturerSelfSubscribe(payment.lecturer_id, service);
      if (!allowed) {
        await service.from("payments").update({ status: "failed" }).eq("id", payment.id);
        return NextResponse.json(
          {
            status: "failed",
            error:
              "Cannot activate a paid subscription while an administrator-granted Premium plan is active.",
          },
          { status: 403 }
        );
      }

      try {
        await activatePremiumSubscription({
          lecturerId: payment.lecturer_id,
          billingPlan: payment.billing_plan as BillingPlan,
          paymentId: payment.id,
          transactionReference: monimeId,
          service,
        });
      } catch (err) {
        if (err instanceof PaymentActivationInProgressError) {
          return NextResponse.json({ status: "processing" });
        }
        throw err;
      }

      return NextResponse.json({ status: "completed" });
    }
  }

  return NextResponse.json({ status: payment.status });
}
