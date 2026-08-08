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

/** Charge amount in major currency units from code defaults (USD list price or SLE). */
export function getBillingChargeAmount(plan: BillingPlan): number {
  if (getMonimeCurrency() === "USD") {
    return BILLING_PLAN_PRICES[plan];
  }
  return DEFAULT_SLE_CHARGE_AMOUNTS[plan];
}
