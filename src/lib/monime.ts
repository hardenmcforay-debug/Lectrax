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

function truncateIdempotencyKey(key: string): string {
  // Monime Idempotency-Key maxLength is 64.
  return key.length <= 64 ? key : key.slice(0, 64);
}

function pickCheckoutRedirectUrl(data: {
  redirectUrl?: string;
  redirect_url?: string;
  url?: string;
}): string {
  const candidate = data.redirectUrl ?? data.redirect_url ?? data.url;
  return typeof candidate === "string" ? candidate.trim() : "";
}

async function monimeFetch<T>(
  path: string,
  init: RequestInit,
  options?: { idempotencyKey?: string }
): Promise<T> {
  const apiKey = process.env.MONIME_API_KEY?.trim();
  const spaceId = process.env.MONIME_SPACE_ID?.trim();
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
      "Idempotency-Key": truncateIdempotencyKey(
        options?.idempotencyKey ?? randomUUID()
      ),
      ...(init.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as MonimeEnvelope<T>;

  if (!response.ok || body.success === false) {
    const message =
      body.error?.message ??
      body.error?.reason ??
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

/** Generic Monime checkout for non-lecturer flows (e.g. university partnerships). */
export interface MonimeCustomCheckoutParams {
  name: string;
  amountMajor: number;
  paymentId: string;
  paymentMethod: LectraxPaymentMethod;
  successUrl: string;
  cancelUrl: string;
  customerName?: string | null;
  metadata: Record<string, string>;
  idempotencyPrefix?: string;
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

function buildLineItems(name: string, currency: string, amountMinor: number) {
  return [
    {
      type: "custom" as const,
      name,
      price: { currency, value: amountMinor },
      quantity: 1,
    },
  ];
}

function buildLecturerMetadata(params: MonimeCheckoutParams) {
  return {
    lecturer_id: params.lecturerId,
    billing_plan: params.plan,
    payment_id: params.paymentId,
    payment_method: params.paymentMethod,
  };
}

async function createCardCheckoutSession(
  params: MonimeCustomCheckoutParams
): Promise<MonimeCheckoutResult> {
  const currency = getMonimeCurrency();
  const amountMinor = toMonimeMinorUnits(params.amountMajor);
  const prefix = params.idempotencyPrefix ?? "cxs";

  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    throw new Error("Monime request failed: Invalid checkout amount");
  }

  const data = await monimeFetch<{
    id?: string;
    redirectUrl?: string;
    redirect_url?: string;
    url?: string;
  }>(
    "/checkout-sessions",
    {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        lineItems: buildLineItems(params.name, currency, amountMinor),
        reference: params.paymentId,
        metadata: params.metadata,
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
    { idempotencyKey: `${prefix}:${params.paymentId}` }
  );

  const checkoutUrl = pickCheckoutRedirectUrl(data);
  if (!data.id || !checkoutUrl) {
    throw new Error("Monime did not return a checkout URL for card payment");
  }

  return { kind: "redirect", id: data.id, checkoutUrl };
}

/**
 * Mobile money: create a Monime Payment Code and show the USSD dial string in-app.
 * Customer dials the code on their phone; Lectrax polls until payment completes.
 */
async function createMobileMoneyPaymentCode(
  params: MonimeCustomCheckoutParams
): Promise<MonimeCheckoutResult> {
  const method = getPaymentMethodOption(params.paymentMethod);
  if (!method?.providerId) {
    throw new Error("Invalid mobile money payment method");
  }

  const currency = getMonimeCurrency();
  const amountMinor = toMonimeMinorUnits(params.amountMajor);
  const prefix = params.idempotencyPrefix ?? "pc";

  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    throw new Error("Monime request failed: Invalid payment amount");
  }

  // Keep session name within Monime payment-code name maxLength (64).
  const name = params.name.slice(0, 64);

  const data = await monimeFetch<{ id?: string; ussdCode?: string }>(
    "/payment-codes",
    {
      method: "POST",
      body: JSON.stringify({
        mode: "one_time",
        enable: true,
        name,
        amount: { currency, value: amountMinor },
        reference: params.paymentId.slice(0, 64),
        duration: "30m",
        authorizedProviders: [method.providerId],
        customer: params.customerName
          ? { name: params.customerName.slice(0, 100) }
          : undefined,
        metadata: params.metadata,
      }),
    },
    { idempotencyKey: `${prefix}:${params.paymentId}` }
  );

  if (!data.id || !data.ussdCode) {
    throw new Error("Monime did not return a USSD payment code");
  }

  return {
    kind: "ussd",
    id: data.id,
    ussdCode: data.ussdCode,
    providerLabel: method.label,
    amountMajor: params.amountMajor,
    currency,
  };
}

export async function createMonimeCustomCheckout(
  params: MonimeCustomCheckoutParams
): Promise<MonimeCheckoutResult> {
  const method = getPaymentMethodOption(params.paymentMethod);
  if (!method) {
    throw new Error("Unsupported payment method");
  }

  if (method.channel === "card") {
    return createCardCheckoutSession(params);
  }

  // Mobile money stays in-app: Monime returns a USSD dial code (no redirect).
  return createMobileMoneyPaymentCode(params);
}

export async function createMonimeCheckout(params: MonimeCheckoutParams): Promise<MonimeCheckoutResult> {
  const amountMajor = getBillingChargeAmount(params.plan);

  return createMonimeCustomCheckout({
    // ASCII hyphen — some payment gateways reject unicode dashes in session names.
    name: `Lectrax Premium - ${params.plan}`,
    amountMajor,
    paymentId: params.paymentId,
    paymentMethod: params.paymentMethod,
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
    customerName: params.customerName,
    metadata: buildLecturerMetadata(params),
  });
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

function parseMonimeSignatureHeader(header: string): {
  timestamp: string | null;
  signatures: string[];
} {
  const signatures: string[] = [];
  let timestamp: string | null = null;

  for (const part of header.split(/[,;\s]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      signatures.push(trimmed.replace(/^sha256=/i, ""));
      continue;
    }
    const key = trimmed.slice(0, eq).trim().toLowerCase();
    const value = trimmed.slice(eq + 1).trim().replace(/^sha256=/i, "");
    if (!value) continue;
    if (key === "t" || key === "ts" || key === "timestamp") {
      timestamp = value;
    } else {
      signatures.push(value);
    }
  }

  return { timestamp, signatures };
}

function normalizeWebhookSecret(secret: string): string {
  let value = secret.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value.replace(/\\n/g, "\n");
}

function looksLikePem(secret: string): boolean {
  return /BEGIN (PUBLIC KEY|CERTIFICATE|EC PUBLIC KEY)/.test(secret);
}

function safeEqualBytes(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

function hmacMatches(secret: string | Buffer, message: string, provided: string): boolean {
  const candidate = provided.trim().replace(/^sha256=/i, "");
  const hex = createHmac("sha256", secret).update(message).digest();
  const providedHex = Buffer.from(candidate, "hex");
  if (providedHex.length === hex.length && safeEqualBytes(hex, providedHex)) return true;

  const providedB64 = Buffer.from(candidate, "base64");
  if (providedB64.length === hex.length && safeEqualBytes(hex, providedB64)) return true;

  return false;
}

function signedMessages(payload: string, timestamp: string | null): string[] {
  if (!timestamp) return [payload];
  return [`${timestamp}.${payload}`, `${timestamp}${payload}`, payload];
}

function hmacSecrets(secret: string): Array<string | Buffer> {
  const secrets: Array<string | Buffer> = [secret];
  const compact = secret.replace(/\s/g, "");
  if (/^[A-Za-z0-9+/]+=*$/.test(compact) && compact.length >= 16) {
    const decoded = Buffer.from(compact, "base64");
    if (decoded.length >= 16) secrets.push(decoded);
  }
  return secrets;
}

function verifyHmacWebhookSignature(secret: string, payload: string, header: string): boolean {
  const { timestamp, signatures } = parseMonimeSignatureHeader(header);
  const provided = signatures.length ? signatures : [header.trim()];
  const messages = signedMessages(payload, timestamp);

  for (const key of hmacSecrets(secret)) {
    for (const message of messages) {
      for (const signature of provided) {
        if (hmacMatches(key, message, signature)) return true;
      }
    }
  }

  return false;
}

function verifyEs256WebhookSignature(
  publicKeyPem: string,
  payload: string,
  header: string
): boolean {
  const { timestamp, signatures } = parseMonimeSignatureHeader(header);
  const provided = signatures.length ? signatures : [header.trim()];
  const messages = signedMessages(payload, timestamp);
  const encodings = ["base64", "base64url", "hex"] as const;
  const dsaEncodings = ["der", "ieee-p1363"] as const;

  for (const message of messages) {
    for (const signature of provided) {
      for (const encoding of encodings) {
        for (const dsaEncoding of dsaEncodings) {
          try {
            if (
              createVerify("SHA256")
                .update(message)
                .verify({ key: publicKeyPem, dsaEncoding }, signature, encoding)
            ) {
              return true;
            }
          } catch {
            // try next encoding / format
          }
        }
      }
    }
  }

  return false;
}

/** Monime sends `Monime-Signature`; keep legacy alias for older configs. */
export function getMonimeWebhookSignature(request: Request): string | null {
  return (
    request.headers.get("monime-signature") ??
    request.headers.get("x-monime-signature") ??
    request.headers.get("webhook-signature")
  );
}

export function verifyMonimeWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  const secret = process.env.MONIME_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const normalized = normalizeWebhookSecret(secret);
  if (!normalized) return false;

  if (looksLikePem(normalized)) {
    return verifyEs256WebhookSignature(normalized, payload, signature);
  }

  return verifyHmacWebhookSignature(normalized, payload, signature);
}
