/**
 * Monime payment integration
 * Docs: https://docs.monime.io
 */

import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { BillingPlan } from "@/types/database";
import {
  getBillingChargeAmount,
  getMonimeCurrency,
  toMonimeMinorUnits,
} from "@/lib/subscription/payment-currency";
import type { LectraxPaymentMethod } from "@/lib/monime/payment-methods";
import { getPaymentMethodOption } from "@/lib/monime/payment-methods";

const MONIME_API = "https://api.monime.io/v1";
const MONIME_VERSION = "caph.2025-08-23";

type MonimeEnvelope<T> = {
  success?: boolean;
  messages?: unknown[];
  error?: { message?: string; code?: number; reason?: string };
  result?: T;
} & Partial<T>;

function unwrapMonimeResult<T>(body: MonimeEnvelope<T>): T {
  if (body.result) return body.result;
  return body as T;
}

async function monimeFetch<T>(path: string, init: RequestInit): Promise<T> {
  const apiKey = process.env.MONIME_API_KEY;
  const spaceId = process.env.MONIME_SPACE_ID;
  if (!apiKey || !spaceId) {
    throw new Error("Monime is not configured");
  }

  const response = await fetch(`${MONIME_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Monime-Space-Id": spaceId,
      "Monime-Version": MONIME_VERSION,
      "Idempotency-Key": randomUUID(),
      ...(init.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as MonimeEnvelope<T>;

  if (!response.ok || body.success === false) {
    const message =
      body.error?.message ??
      (typeof body === "object" ? JSON.stringify(body) : "Monime request failed");
    throw new Error(`Monime request failed: ${message}`);
  }

  return unwrapMonimeResult(body);
}

export interface MonimeCheckoutParams {
  plan: BillingPlan;
  lecturerId: string;
  paymentId: string;
  paymentMethod: LectraxPaymentMethod;
  successUrl: string;
  cancelUrl: string;
  customerName?: string | null;
}

export type MonimeCheckoutResult =
  | {
      kind: "redirect";
      id: string;
      checkoutUrl: string;
    }
  | {
      kind: "ussd";
      id: string;
      ussdCode: string;
      providerLabel: string;
      amountMajor: number;
      currency: string;
    };

function buildLineItems(plan: BillingPlan, currency: string, amountMinor: number) {
  return [
    {
      type: "custom" as const,
      name: `Lectrax Premium — ${plan}`,
      price: { currency, value: amountMinor },
      quantity: 1,
    },
  ];
}

function buildMetadata(params: MonimeCheckoutParams) {
  return {
    lecturer_id: params.lecturerId,
    billing_plan: params.plan,
    payment_id: params.paymentId,
    payment_method: params.paymentMethod,
  };
}

async function createCardCheckoutSession(params: MonimeCheckoutParams): Promise<MonimeCheckoutResult> {
  const currency = getMonimeCurrency();
  const amountMajor = getBillingChargeAmount(params.plan);
  const amountMinor = toMonimeMinorUnits(amountMajor);

  const data = await monimeFetch<{ id?: string; redirectUrl?: string }>("/checkout-sessions", {
    method: "POST",
    body: JSON.stringify({
      name: `Lectrax Premium — ${params.plan}`,
      lineItems: buildLineItems(params.plan, currency, amountMinor),
      reference: params.paymentId,
      metadata: buildMetadata(params),
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      paymentOptions: {
        card: { disable: false },
        momo: { disable: true },
        bank: { disable: true },
        wallet: { disable: true },
      },
    }),
  });

  const checkoutUrl = data.redirectUrl ?? "";
  if (!data.id || !checkoutUrl) {
    throw new Error("Monime did not return a checkout URL for card payment");
  }

  return { kind: "redirect", id: data.id, checkoutUrl };
}

async function createMobileMoneyPaymentCode(params: MonimeCheckoutParams): Promise<MonimeCheckoutResult> {
  const method = getPaymentMethodOption(params.paymentMethod);
  if (!method?.providerId) {
    throw new Error("Invalid mobile money payment method");
  }

  const currency = getMonimeCurrency();
  const amountMajor = getBillingChargeAmount(params.plan);
  const amountMinor = toMonimeMinorUnits(amountMajor);

  const data = await monimeFetch<{ id?: string; ussdCode?: string }>("/payment-codes", {
    method: "POST",
    body: JSON.stringify({
      mode: "one_time",
      name: `Lectrax ${params.plan}`,
      amount: { currency, value: amountMinor },
      reference: params.paymentId,
      duration: "30m",
      authorizedProviders: [method.providerId],
      customer: params.customerName ? { name: params.customerName } : undefined,
      metadata: buildMetadata(params),
    }),
  });

  if (!data.id || !data.ussdCode) {
    throw new Error("Monime did not return a USSD payment code");
  }

  return {
    kind: "ussd",
    id: data.id,
    ussdCode: data.ussdCode,
    providerLabel: method.label,
    amountMajor,
    currency,
  };
}

export async function createMonimeCheckout(params: MonimeCheckoutParams): Promise<MonimeCheckoutResult> {
  const method = getPaymentMethodOption(params.paymentMethod);
  if (!method) {
    throw new Error("Unsupported payment method");
  }

  if (method.channel === "card") {
    return createCardCheckoutSession(params);
  }

  return createMobileMoneyPaymentCode(params);
}

export async function verifyMonimePayment(sessionId: string): Promise<{
  completed: boolean;
  reference?: string;
}> {
  if (!sessionId) return { completed: false };

  try {
    const data = await monimeFetch<{ status?: string; paymentStatus?: string; reference?: string }>(
      `/checkout-sessions/${sessionId}`,
      { method: "GET", headers: {} }
    );

    const status = (data.paymentStatus ?? data.status ?? "").toLowerCase();
    return {
      completed: status === "completed" || status === "paid" || status === "success",
      reference: data.reference,
    };
  } catch {
    return { completed: false };
  }
}

export async function verifyMonimePaymentCode(paymentCodeId: string): Promise<{
  completed: boolean;
  reference?: string;
}> {
  if (!paymentCodeId) return { completed: false };

  try {
    const data = await monimeFetch<{ status?: string; reference?: string }>(
      `/payment-codes/${paymentCodeId}`,
      { method: "GET", headers: {} }
    );

    const status = (data.status ?? "").toLowerCase();
    return {
      completed: status === "completed",
      reference: data.reference,
    };
  } catch {
    return { completed: false };
  }
}

export function verifyMonimeWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  const secret = process.env.MONIME_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return signature === expected;
  }
}
