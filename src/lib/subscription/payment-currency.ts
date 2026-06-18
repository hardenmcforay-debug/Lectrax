import type { BillingPlan } from "@/types/database";
import { BILLING_PLAN_PRICES } from "@/types/database";

export type PaymentCurrency = "SLE" | "USD";

/** Default charge amounts in SLE (major units / whole leones). */
export const DEFAULT_SLE_CHARGE_AMOUNTS: Record<BillingPlan, number> = {
  monthly: 120,
  semester: 480,
  annual: 1200,
};

/** Monime expects minor units (e.g. cents: 120 SLE → 12000). */
export function toMonimeMinorUnits(majorAmount: number): number {
  return Math.round(majorAmount * 100);
}

export function formatChargeAmount(
  amount: number,
  currency: PaymentCurrency = "SLE"
): string {
  if (currency === "SLE") {
    return `Le ${amount.toLocaleString()}`;
  }
  return `$${amount}`;
}

/** USD list prices shown in the UI. Monime charges in SLE separately. */
export function getDisplayUsdPrice(plan: BillingPlan): number {
  return BILLING_PLAN_PRICES[plan];
}

export function formatUsdPrice(plan: BillingPlan): string {
  return `$${BILLING_PLAN_PRICES[plan]}`;
}

export function formatSleChargeAmount(plan: BillingPlan, amountMajor?: number): string {
  const major = amountMajor ?? DEFAULT_SLE_CHARGE_AMOUNTS[plan];
  return `Le ${major.toLocaleString()}`;
}

/** Shown in checkout when UI is USD but Monime collects SLE. */
export function formatCheckoutChargeSummary(plan: BillingPlan, amountMajor?: number): string {
  return `${formatUsdPrice(plan)} (${formatSleChargeAmount(plan, amountMajor)} via Monime)`;
}
