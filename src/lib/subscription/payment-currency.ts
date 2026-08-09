import type { BillingPlan } from "@/types/database";
import { BILLING_PLAN_DURATION_DAYS, BILLING_PLAN_PRICES } from "@/types/database";

export type PaymentCurrency = "SLE" | "USD";

/** Default charge amounts in SLE (major units / whole leones). */
export const DEFAULT_SLE_CHARGE_AMOUNTS: Record<BillingPlan, number> = {
  monthly: 240,
  semester: 840,
  annual: 2160,
};

export type BillingPlanListPayPricing = {
  months: number;
  listUsd: number;
  payUsd: number;
  listSle: number;
  paySle: number;
  /** 0 when list === pay; otherwise percent off list (e.g. 12.5). */
  discountPercent: number;
};

/** Covered months from plan duration (30-day months). */
export function getBillingPlanMonths(plan: BillingPlan): number {
  return BILLING_PLAN_DURATION_DAYS[plan] / 30;
}

/**
 * List price = monthly rate × covered months; pay price = plan charge.
 * Used for strikethrough + Save X% on pricing cards.
 */
export function getBillingPlanListPayPricing(plan: BillingPlan): BillingPlanListPayPricing {
  const months = getBillingPlanMonths(plan);
  const listUsd = BILLING_PLAN_PRICES.monthly * months;
  const payUsd = BILLING_PLAN_PRICES[plan];
  const listSle = DEFAULT_SLE_CHARGE_AMOUNTS.monthly * months;
  const paySle = DEFAULT_SLE_CHARGE_AMOUNTS[plan];
  const discountPercent =
    listUsd > payUsd ? Math.round(((listUsd - payUsd) / listUsd) * 1000) / 10 : 0;

  return { months, listUsd, payUsd, listSle, paySle, discountPercent };
}

/** Format discount for badges, e.g. 12.5 → "12.5%", 10 → "10%". */
export function formatDiscountPercent(discountPercent: number): string {
  if (discountPercent <= 0) return "0%";
  const rounded = Math.round(discountPercent * 10) / 10;
  return `${rounded}%`;
}

/** Monime expects minor units (e.g. cents: 120 SLE → 12000). */
export function toMonimeMinorUnits(majorAmount: number): number {
  return Math.round(majorAmount * 100);
}

export function formatChargeAmount(
  amount: number,
  currency: PaymentCurrency = "SLE"
): string {
  if (currency === "SLE") {
    return `Le ${amount.toLocaleString("en-US")}`;
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
  return `Le ${major.toLocaleString("en-US")}`;
}

/** Shown in checkout when UI is USD but Monime collects SLE. */
export function formatCheckoutChargeSummary(plan: BillingPlan, amountMajor?: number): string {
  return `${formatUsdPrice(plan)} (${formatSleChargeAmount(plan, amountMajor)}) via Monime`;
}
