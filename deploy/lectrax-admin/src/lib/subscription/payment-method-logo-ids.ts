/** Client-safe payment method logo ids and labels (no server imports). */

export type PaymentMethodLogoId = "orange_money" | "afrimoney" | "visa_card";

export const PAYMENT_METHOD_LOGO_OPTIONS: ReadonlyArray<{
  id: PaymentMethodLogoId;
  label: string;
}> = [
  { id: "orange_money", label: "Orange Money" },
  { id: "afrimoney", label: "Afrimoney" },
  { id: "visa_card", label: "Card Payment" },
];

export function isPaymentMethodLogoId(value: string): value is PaymentMethodLogoId {
  return PAYMENT_METHOD_LOGO_OPTIONS.some((option) => option.id === value);
}

export function buildPaymentMethodLogoStoragePath(
  methodId: PaymentMethodLogoId,
  ext: string,
  version: string | number = Date.now()
): string {
  return `payment-methods/${methodId}/${version}.${ext}`;
}
