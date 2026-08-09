import "server-only";

import type { PartnershipPackageId } from "@/lib/partnerships/constants";
import { DEFAULT_PARTNERSHIP_SLE_AMOUNTS } from "@/lib/partnerships/constants";

/** Charge amount in SLE major units for partnership packages (code defaults). */
export function getPartnershipChargeAmount(packageId: PartnershipPackageId): number {
  return DEFAULT_PARTNERSHIP_SLE_AMOUNTS[packageId];
}
