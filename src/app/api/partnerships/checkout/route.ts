import { NextResponse } from "next/server";
import { userFacingZodMessage } from "@/lib/security/zod-helpers";
import { partnershipCheckoutSchema } from "@/lib/validations";
import { createServiceClient } from "@/lib/supabase/server";
import { isServiceRoleConfigured, getAppUrl } from "@/lib/env";
import { createMonimeCustomCheckout } from "@/lib/monime";
import { getMonimeCurrency } from "@/lib/subscription/payment-currency-server";
import { PAYMENT_METHOD_LABELS } from "@/lib/monime/payment-methods";
import { getPartnershipPaymentPackage } from "@/lib/partnerships/constants";
import { getPartnershipChargeAmount } from "@/lib/partnerships/payment-currency-server";
import { logServerError } from "@/lib/errors/logger";
import {
  apiDatabaseErrorResponse,
  apiPaymentUnavailableResponse,
  handleApiRouteError,
} from "@/lib/errors/api";
import { sanitizeErrorMessage, isTransientError } from "@/lib/errors/classify";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = partnershipCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: userFacingZodMessage(parsed.error, "Invalid checkout request") },
      { status: 400 }
    );
  }

  if (!isServiceRoleConfigured()) {
    logServerError("partnerships.checkout.config", new Error("Service role not configured"));
    return NextResponse.json(
      { error: "Could not start payment. Please try again." },
      { status: 500 }
    );
  }

  const data = parsed.data;
  const pkg = getPartnershipPaymentPackage(data.packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Invalid partnership package" }, { status: 400 });
  }

  const chargeAmount = getPartnershipChargeAmount(data.packageId);
  const currency = getMonimeCurrency();
  const service = await createServiceClient();

  const { data: payment, error } = await service
    .from("university_partnership_payments")
    .insert({
      package_id: data.packageId,
      package_name: pkg.name,
      amount: chargeAmount,
      currency,
      display_amount_usd: pkg.price,
      billing_cycle: "yearly",
      university_name: data.universityName,
      department_name: data.departmentName,
      contact_person: data.contactPerson,
      email: data.email,
      phone_number: data.phoneNumber,
      country: data.country,
      payment_method: PAYMENT_METHOD_LABELS[data.paymentMethod],
      status: "pending",
      payment_provider: "MONIME",
      metadata: {
        payment_method: data.paymentMethod,
        flow: "partnership",
      },
    })
    .select()
    .single();

  if (error || !payment) {
    logServerError("partnerships.checkout.insert", error);
    const code = (error as { code?: string } | null)?.code;
    if (code === "PGRST205" || error?.message?.includes("university_partnership_payments")) {
      return NextResponse.json(
        {
          error:
            "Partnership payments are not set up yet. Apply migration 052_university_partnership_payments.sql in Supabase, then try again.",
        },
        { status: 503 }
      );
    }
    return apiDatabaseErrorResponse(
      sanitizeErrorMessage(error?.message ?? "Could not create payment")
    );
  }

  const appUrl = getAppUrl(new URL(request.url).origin);
  const returnBase = `${appUrl}/payments/return`;

  try {
    const checkout = await createMonimeCustomCheckout({
      name: `Lectrax Partnership — ${pkg.name}`,
      amountMajor: chargeAmount,
      paymentId: payment.id,
      paymentMethod: data.paymentMethod,
      customerName: data.contactPerson,
      successUrl: `${returnBase}?outcome=success&flow=partnership&paymentId=${payment.id}`,
      cancelUrl: `${returnBase}?outcome=cancelled&flow=partnership&paymentId=${payment.id}`,
      idempotencyPrefix: "partnership-checkout",
      metadata: {
        flow: "partnership",
        payment_id: payment.id,
        package_id: data.packageId,
        package_name: pkg.name,
        university_name: data.universityName,
        customer_email: data.email,
        payment_method: data.paymentMethod,
      },
    });

    await service
      .from("university_partnership_payments")
      .update({
        monime_payment_id: checkout.id,
        transaction_reference: checkout.id,
        metadata: {
          payment_method: data.paymentMethod,
          flow: "partnership",
          monime_kind: checkout.kind,
          ...(checkout.kind === "ussd" ? { ussd_code: checkout.ussdCode } : {}),
        },
      })
      .eq("id", payment.id);

    await service.from("audit_logs").insert({
      actor_id: null,
      action: "partnership_payment_checkout_started",
      entity_type: "university_partnership_payment",
      entity_id: payment.id,
      metadata: {
        package_id: data.packageId,
        payment_method: data.paymentMethod,
        monime_kind: checkout.kind,
        monime_id: checkout.id,
        university_name: data.universityName,
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
      packageName: pkg.name,
      displayAmountUsd: pkg.price,
    });
  } catch (e) {
    await service
      .from("university_partnership_payments")
      .update({ status: "failed" })
      .eq("id", payment.id);
    if (isTransientError(e)) {
      return apiPaymentUnavailableResponse();
    }
    return handleApiRouteError("partnerships.checkout", e);
  }
}
