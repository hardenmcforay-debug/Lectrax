import "server-only";

import type { PartnershipPackageId } from "@/lib/partnerships/constants";
import { DEFAULT_PARTNERSHIP_SLE_AMOUNTS } from "@/lib/partnerships/constants";
import { getPartnershipDisplayUsdAmount } from "@/lib/partnerships/payment-currency";
import { getMonimeCurrency } from "@/lib/subscription/payment-currency-server";

function sleAmountFromEnv(packageId: PartnershipPackageId): number | null {
  const key = {
    small: "MONIME_AMOUNT_PARTNERSHIP_SMALL",
    medium: "MONIME_AMOUNT_PARTNERSHIP_MEDIUM",
    large: "MONIME_AMOUNT_PARTNERSHIP_LARGE",
  }[packageId];
  const raw = process.env[key];
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Charge amount in major currency units for partnership packages. */
export function getPartnershipChargeAmount(packageId: PartnershipPackageId): number {
  if (getMonimeCurrency() === "USD") {
    return getPartnershipDisplayUsdAmount(packageId);
  }
  return sleAmountFromEnv(packageId) ?? DEFAULT_PARTNERSHIP_SLE_AMOUNTS[packageId];
}
