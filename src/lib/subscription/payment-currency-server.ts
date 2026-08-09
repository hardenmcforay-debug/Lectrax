import "server-only";

import type { BillingPlan } from "@/types/database";
import {
  DEFAULT_SLE_CHARGE_AMOUNTS,
  type PaymentCurrency,
} from "@/lib/subscription/payment-currency";

/**
 * Currency sent to Monime Checkout Session / Payment Code APIs.
 * Monime currently accepts SLE for these endpoints — keep display USD separate.
 */
export function getMonimeCurrency(): PaymentCurrency {
  return "SLE";
}

/** Charge amount in SLE major units from code defaults. */
export function getBillingChargeAmount(plan: BillingPlan): number {
  return DEFAULT_SLE_CHARGE_AMOUNTS[plan];
}
