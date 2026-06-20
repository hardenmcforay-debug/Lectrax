import "server-only";

/**
 * Monime payment integration
 * Docs: https://docs.monime.io
 */

import { createHmac, createVerify, randomUUID, timingSafeEqual } from "crypto";
import type { BillingPlan } from "@/types/database";
import {
  getBillingChargeAmount,
  getMonimeCurrency,
} from "@/lib/subscription/payment-currency-server";
import { toMonimeMinorUnits } from "@/lib/subscription/payment-currency";
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

async function monimeFetch<T>(
  path: string,
  init: RequestInit,
  options?: { idempotencyKey?: string }
): Promise<T> {
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
      "Idempotency-Key": options?.idempotencyKey ?? randomUUID(),
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

  const data = await monimeFetch<{ id?: string; redirectUrl?: string }>(
    "/checkout-sessions",
    {
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
    },
    { idempotencyKey: `checkout:${params.paymentId}` }
  );

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

  const data = await monimeFetch<{ id?: string; ussdCode?: string }>(
    "/payment-codes",
    {
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
    },
    { idempotencyKey: `payment-code:${params.paymentId}` }
  );

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

const MONIME_WEBHOOK_TOLERANCE_SEC = 300;

function parseMonimeSignatureHeader(header: string): {
  timestamp: string | null;
  signatures: Map<string, string>;
} {
  const signatures = new Map<string, string>();
  let timestamp: string | null = null;

  for (const part of header.split(",")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key === "t") {
      timestamp = value;
    } else if (key.startsWith("v")) {
      signatures.set(key, value);
    }
  }

  return { timestamp, signatures };
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function computeHmacHex(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

function isWebhookTimestampFresh(timestamp: string): boolean {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return true;

  const tsSec = parsed > 1e12 ? Math.floor(parsed / 1000) : Math.floor(parsed);
  const nowSec = Math.floor(Date.now() / 1000);
  return Math.abs(nowSec - tsSec) <= MONIME_WEBHOOK_TOLERANCE_SEC;
}

function verifyEs256WebhookSignature(
  publicKeyPem: string,
  payload: string,
  header: string
): boolean {
  const { timestamp, signatures } = parseMonimeSignatureHeader(header);
  const signature = signatures.get("v1");
  if (!signature) return false;

  const messages = timestamp
    ? [`${timestamp}.${payload}`, `${timestamp}${payload}`, payload]
    : [payload];

  for (const message of messages) {
    for (const encoding of ["base64", "hex"] as const) {
      try {
        if (createVerify("SHA256").update(message).verify(publicKeyPem, signature, encoding)) {
          return !timestamp || isWebhookTimestampFresh(timestamp);
        }
      } catch {
        // try next encoding
      }
    }
  }

  return false;
}

function verifyHmacWebhookSignature(
  secret: string,
  payload: string,
  header: string
): boolean {
  const { timestamp, signatures } = parseMonimeSignatureHeader(header);
  const v1 = signatures.get("v1");

  if (v1) {
    const candidates = timestamp
      ? [`${timestamp}.${payload}`, `${timestamp}${payload}`, payload]
      : [payload];

    for (const message of candidates) {
      if (safeEqualHex(computeHmacHex(secret, message), v1)) {
        return !timestamp || isWebhookTimestampFresh(timestamp);
      }
    }
    return false;
  }

  if (!header.includes("=")) {
    if (safeEqualHex(computeHmacHex(secret, payload), header)) {
      return true;
    }
  }

  const expected = computeHmacHex(secret, payload);
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return header === expected;
  }
}

/** Monime sends `Monime-Signature`; keep legacy alias for older configs. */
export function getMonimeWebhookSignature(request: Request): string | null {
  return request.headers.get("monime-signature") ?? request.headers.get("x-monime-signature");
}

export function verifyMonimeWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  const secret = process.env.MONIME_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  if (secret.includes("BEGIN PUBLIC KEY") || secret.includes("BEGIN CERTIFICATE")) {
    return verifyEs256WebhookSignature(secret, payload, signature);
  }

  return verifyHmacWebhookSignature(secret, payload, signature);
}
