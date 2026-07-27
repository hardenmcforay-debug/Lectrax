import type { PartnershipPackageId } from "@/lib/partnerships/constants";
import {
  DEFAULT_PARTNERSHIP_SLE_AMOUNTS,
  getPartnershipPaymentPackage,
} from "@/lib/partnerships/constants";

export function getPartnershipDisplayUsdAmount(packageId: PartnershipPackageId): number {
  return getPartnershipPaymentPackage(packageId)?.price ?? 0;
}

export function getPartnershipDefaultSleAmount(packageId: PartnershipPackageId): number {
  return DEFAULT_PARTNERSHIP_SLE_AMOUNTS[packageId];
}

export function formatPartnershipUsdPrice(packageId: PartnershipPackageId): string {
  const amount = getPartnershipDisplayUsdAmount(packageId);
  return `$${amount.toLocaleString("en-US")}`;
}

export function formatPartnershipSleAmount(amountMajor: number): string {
  return `Le ${amountMajor.toLocaleString("en-US")}`;
}

/** Local mobile-money methods are charged in SLE via Monime USSD. */
export function formatPartnershipLocalCheckoutSummary(
  packageId: PartnershipPackageId,
  amountMajor?: number
): string {
  const usd = formatPartnershipUsdPrice(packageId);
  const sle = formatPartnershipSleAmount(
    amountMajor ?? getPartnershipDefaultSleAmount(packageId)
  );
  return `${usd} (${sle}) via Monime USSD`;
}
