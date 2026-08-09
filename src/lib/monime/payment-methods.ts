export type LectraxPaymentMethod = "orange_money" | "afrimoney" | "visa_card";

/** Methods shown in Choose payment method (card is not offered). */
export type SelectablePaymentMethod = Exclude<LectraxPaymentMethod, "visa_card">;

export type MonimeMomoProviderId = "m17" | "m18";

export interface PaymentMethodOption {
  id: LectraxPaymentMethod;
  label: string;
  description: string;
  channel: "momo" | "card";
  providerId?: MonimeMomoProviderId;
}

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  {
    id: "orange_money",
    label: "Orange Money",
    description: "Get a USSD code and pay with Orange Money on your phone",
    channel: "momo",
    providerId: "m17",
  },
  {
    id: "afrimoney",
    label: "Afrimoney",
    description: "Get a USSD code and pay with Afrimoney on your phone",
    channel: "momo",
    providerId: "m18",
  },
];

export function getPaymentMethodOption(id: LectraxPaymentMethod): PaymentMethodOption | undefined {
  if (id === "visa_card") {
    return {
      id: "visa_card",
      label: "Card Payment",
      description: "Pay securely with debit or credit card",
      channel: "card",
    };
  }
  return PAYMENT_METHOD_OPTIONS.find((option) => option.id === id);
}

export const PAYMENT_METHOD_LABELS: Record<LectraxPaymentMethod, string> = {
  orange_money: "Orange Money",
  afrimoney: "Afrimoney",
  visa_card: "Card Payment",
};
