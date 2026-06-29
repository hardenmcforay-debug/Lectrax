import { NextResponse } from "next/server";
import { requireLecturerRole } from "@/lib/auth/require-api-role";
import { verifyMonimePayment, verifyMonimePaymentCode } from "@/lib/monime";
import {
  activatePremiumSubscription,
  canLecturerSelfSubscribe,
  PaymentActivationInProgressError,
} from "@/lib/subscription/lifecycle";
import type { BillingPlan } from "@/types/database";
import { handleApiRouteError } from "@/lib/errors/api";
import { parseRouteUuid } from "@/lib/security/parse-request";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId: rawPaymentId } = await params;
  const paymentIdParsed = parseRouteUuid(rawPaymentId, "payment ID");
  if (!paymentIdParsed.ok) return paymentIdParsed.response;
  const paymentId = paymentIdParsed.id;

  const auth = await requireLecturerRole();
  if (auth.error) return auth.error;

  const { data: payment } = await auth.service
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("lecturer_id", auth.userId)
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
      const { allowed } = await canLecturerSelfSubscribe(payment.lecturer_id, auth.service);
      if (!allowed) {
        await auth.service.from("payments").update({ status: "failed" }).eq("id", payment.id);
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
          service: auth.service,
        });
      } catch (err) {
        if (err instanceof PaymentActivationInProgressError) {
          return NextResponse.json({ status: "processing" });
        }
        return handleApiRouteError("payments.status", err);
      }

      return NextResponse.json({ status: "completed" });
    }
  }

  return NextResponse.json({ status: payment.status });
}
