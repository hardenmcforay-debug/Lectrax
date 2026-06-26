import "server-only";

import type { BillingPlan } from "@/types/database";
import { BILLING_PLAN_PRICES } from "@/types/database";
import {
  DEFAULT_SLE_CHARGE_AMOUNTS,
  type PaymentCurrency,
} from "@/lib/subscription/payment-currency";

/** Monime financial account currency (must match your Monime space). Server-only. */
export function getMonimeCurrency(): PaymentCurrency {
  const configured = process.env.MONIME_CURRENCY?.trim().toUpperCase();
  return configured === "USD" ? "USD" : "SLE";
}

function sleAmountFromEnv(plan: BillingPlan): number | null {
  const key = {
    monthly: "MONIME_AMOUNT_MONTHLY",
    semester: "MONIME_AMOUNT_SEMESTER",
    annual: "MONIME_AMOUNT_ANNUAL",
  }[plan];
  const raw = process.env[key];
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Charge amount in major currency units (e.g. 120 SLE or 5 USD). Server-only. */
export function getBillingChargeAmount(plan: BillingPlan): number {
  if (getMonimeCurrency() === "USD") {
    return BILLING_PLAN_PRICES[plan];
  }
  return sleAmountFromEnv(plan) ?? DEFAULT_SLE_CHARGE_AMOUNTS[plan];
}
