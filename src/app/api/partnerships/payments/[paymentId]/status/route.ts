import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isServiceRoleConfigured } from "@/lib/env";
import { verifyMonimePayment, verifyMonimePaymentCode } from "@/lib/monime";
import { completePartnershipPayment } from "@/lib/partnerships/complete-payment";
import { handleApiRouteError } from "@/lib/errors/api";
import { parseRouteUuid } from "@/lib/security/parse-request";
import { logServerError } from "@/lib/errors/logger";
import { withApiObservability } from "@/lib/observability/with-api-observability";


async function getHandler(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId: rawPaymentId } = await params;
  const paymentIdParsed = parseRouteUuid(rawPaymentId, "payment ID");
  if (!paymentIdParsed.ok) return paymentIdParsed.response;
  const paymentId = paymentIdParsed.id;

  if (!isServiceRoleConfigured()) {
    logServerError("partnerships.payment.status.config", new Error("Service role not configured"));
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const service = await createServiceClient();

  const { data: payment } = await service
    .from("university_partnership_payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.status === "completed") {
    return NextResponse.json({
      status: "completed",
      payment: {
        id: payment.id,
        packageName: payment.package_name,
        displayAmountUsd: payment.display_amount_usd,
        universityName: payment.university_name,
        departmentName: payment.department_name,
        contactPerson: payment.contact_person,
        email: payment.email,
        phoneNumber: payment.phone_number,
        country: payment.country,
        paidAt: payment.paid_at,
        billingCycle: payment.billing_cycle,
      },
    });
  }

  if (payment.status === "failed") {
    return NextResponse.json({ status: "failed" });
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

    if (verified.completed) {
      try {
        await completePartnershipPayment({
          payment: {
            id: payment.id,
            package_id: payment.package_id,
            package_name: payment.package_name,
            university_name: payment.university_name,
            department_name: payment.department_name,
            contact_person: payment.contact_person,
            email: payment.email,
            phone_number: payment.phone_number,
            country: payment.country,
            display_amount_usd: Number(payment.display_amount_usd),
            status: payment.status,
            inquiry_id: payment.inquiry_id,
            metadata: (payment.metadata ?? {}) as Record<string, unknown>,
          },
          transactionReference: monimeId,
          service,
        });
      } catch (err) {
        return handleApiRouteError("partnerships.payment.status", err);
      }

      return NextResponse.json({
        status: "completed",
        payment: {
          id: payment.id,
          packageName: payment.package_name,
          displayAmountUsd: payment.display_amount_usd,
          universityName: payment.university_name,
          departmentName: payment.department_name,
          contactPerson: payment.contact_person,
          email: payment.email,
          phoneNumber: payment.phone_number,
          country: payment.country,
          paidAt: new Date().toISOString(),
          billingCycle: payment.billing_cycle,
        },
      });
    }
  }

  return NextResponse.json({ status: payment.status });
}

export const GET = withApiObservability("partnerships.payments.status.get", getHandler);
