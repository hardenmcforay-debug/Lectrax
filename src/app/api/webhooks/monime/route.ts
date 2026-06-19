import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyMonimeWebhookSignature, verifyMonimePayment, verifyMonimePaymentCode } from "@/lib/monime";
import { activatePremiumSubscription, canLecturerSelfSubscribe, PaymentActivationInProgressError } from "@/lib/subscription/lifecycle";
import type { BillingPlan } from "@/types/database";
import { logAudit } from "@/lib/audit";
import { handleApiRouteError } from "@/lib/errors/api";
import { monimeWebhookEventSchema } from "@/lib/validations";
import { logServerError } from "@/lib/errors/logger";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-monime-signature");

  if (!verifyMonimeWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let eventJson: unknown;
  try {
    eventJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const eventParsed = monimeWebhookEventSchema.safeParse(eventJson);
  if (!eventParsed.success) {
    logServerError("webhooks.monime.invalid_payload", eventParsed.error);
    return NextResponse.json({ received: true });
  }

  const event = eventParsed.data;

  const service = await createServiceClient();
  const metadata = event.data?.metadata;
  const paymentId = metadata?.payment_id ?? event.data?.reference;
  const monimeResourceId = event.data?.id;

  if (!paymentId) {
    return NextResponse.json({ received: true });
  }

  const status = (event.data?.paymentStatus ?? event.data?.status ?? "").toLowerCase();
  const eventCompleted =
    event.type === "payment.completed" ||
    event.type === "checkout.session.completed" ||
    event.type === "payment_code.completed" ||
    status === "completed" ||
    status === "paid" ||
    status === "success";

  if (!eventCompleted && monimeResourceId) {
    const { data: paymentHint } = await service
      .from("payments")
      .select("metadata")
      .eq("id", paymentId)
      .maybeSingle();

    const monimeKind = (paymentHint?.metadata as { monime_kind?: string } | null)?.monime_kind;
    const verified =
      monimeKind === "ussd"
        ? await verifyMonimePaymentCode(monimeResourceId)
        : await verifyMonimePayment(monimeResourceId);

    if (!verified.completed) {
      return NextResponse.json({ received: true });
    }
  } else if (!eventCompleted) {
    return NextResponse.json({ received: true });
  }

  const { data: payment } = await service
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment || payment.status === "completed") {
    return NextResponse.json({ received: true });
  }

  const billingPlan = (payment.billing_plan ?? metadata?.billing_plan) as BillingPlan | null;
  if (!billingPlan) {
    void logAudit({
      action: "payment_webhook_invalid_plan",
      entityType: "payment",
      entityId: payment.id,
      metadata: { event_type: event.type },
    });
    return NextResponse.json({ error: "Missing billing plan" }, { status: 400 });
  }

  try {
    const { allowed } = await canLecturerSelfSubscribe(payment.lecturer_id, service);
    if (!allowed) {
      await service.from("payments").update({ status: "failed" }).eq("id", payment.id);
      void logAudit({
        action: "payment_activation_blocked_admin_granted",
        entityType: "payment",
        entityId: payment.id,
        metadata: { lecturer_id: payment.lecturer_id },
      });
      return NextResponse.json({ received: true, blocked: true });
    }

    await activatePremiumSubscription({
      lecturerId: payment.lecturer_id,
      billingPlan,
      paymentId: payment.id,
      transactionReference: monimeResourceId ?? payment.transaction_reference,
      service,
    });
  } catch (err) {
    if (err instanceof PaymentActivationInProgressError) {
      return NextResponse.json({ received: true, in_progress: true });
    }

    void logAudit({
      action: "payment_activation_failed",
      entityType: "payment",
      entityId: payment.id,
      metadata: {
        error: err instanceof Error ? err.message : "Activation failed",
      },
    });
    return handleApiRouteError("webhooks.monime.activate", err);
  }

  return NextResponse.json({ received: true });
}
