import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createMonimeCheckout } from "@/lib/monime";
import {
  getBillingChargeAmount,
  getMonimeCurrency,
} from "@/lib/subscription/payment-currency-server";
import { PAYMENT_METHOD_LABELS } from "@/lib/monime/payment-methods";
import type { BillingPlan } from "@/types/database";
import { logAudit } from "@/lib/audit";
import { getAppUrl } from "@/lib/env";
import { requireSelfSubscribeAllowed, subscriptionGuardResponse } from "@/lib/subscription/guards";
import {
  apiDatabaseErrorResponse,
  apiPaymentUnavailableResponse,
  apiUnauthorizedResponse,
  handleApiRouteError,
} from "@/lib/errors/api";
import { sanitizeErrorMessage, isTransientError } from "@/lib/errors/classify";

const checkoutSchema = z.object({
  plan: z.enum(["monthly", "semester", "annual"]),
  paymentMethod: z.enum(["orange_money", "afrimoney", "visa_card"]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiUnauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  }

  const { plan, paymentMethod } = parsed.data;
  const chargeAmount = getBillingChargeAmount(plan as BillingPlan);
  const currency = getMonimeCurrency();
  const service = await createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "lecturer") {
    return NextResponse.json({ error: "Only lecturers can subscribe" }, { status: 403 });
  }

  const subscribeGuard = await requireSelfSubscribeAllowed(user.id);
  if (!subscribeGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(subscribeGuard);
    return NextResponse.json({ error, code }, { status });
  }

  const { data: payment, error } = await service
    .from("payments")
    .insert({
      lecturer_id: user.id,
      amount: chargeAmount,
      plan: "1_month",
      billing_plan: plan,
      status: "pending",
      currency,
      payment_provider: "MONIME",
      payment_method: PAYMENT_METHOD_LABELS[paymentMethod],
      metadata: { payment_method: paymentMethod },
    })
    .select()
    .single();

  if (error || !payment) {
    return apiDatabaseErrorResponse(
      sanitizeErrorMessage(error?.message ?? "Could not create payment")
    );
  }

  const appUrl = getAppUrl(new URL(request.url).origin);

  try {
    const checkout = await createMonimeCheckout({
      plan: plan as BillingPlan,
      lecturerId: user.id,
      paymentId: payment.id,
      paymentMethod,
      customerName: profile.full_name,
      successUrl: `${appUrl}/payments/return?outcome=success`,
      cancelUrl: `${appUrl}/payments/return?outcome=cancelled`,
    });

    await service
      .from("payments")
      .update({
        monime_payment_id: checkout.id,
        transaction_reference: checkout.id,
        metadata: {
          payment_method: paymentMethod,
          monime_kind: checkout.kind,
          ...(checkout.kind === "ussd" ? { ussd_code: checkout.ussdCode } : {}),
        },
      })
      .eq("id", payment.id);

    void logAudit({
      action: "payment_checkout_started",
      entityType: "payment",
      entityId: payment.id,
      metadata: {
        billing_plan: plan,
        payment_method: paymentMethod,
        monime_kind: checkout.kind,
        monime_id: checkout.id,
      },
    });

    if (checkout.kind === "redirect") {
      return NextResponse.json({
        kind: "redirect",
        checkoutUrl: checkout.checkoutUrl,
        paymentId: payment.id,
      });
    }

    return NextResponse.json({
      kind: "ussd",
      paymentId: payment.id,
      ussdCode: checkout.ussdCode,
      providerLabel: checkout.providerLabel,
      amountMajor: checkout.amountMajor,
      currency: checkout.currency,
    });
  } catch (e) {
    await service.from("payments").update({ status: "failed" }).eq("id", payment.id);
    if (isTransientError(e)) {
      return apiPaymentUnavailableResponse();
    }
    return handleApiRouteError("payments.checkout", e);
  }
}
