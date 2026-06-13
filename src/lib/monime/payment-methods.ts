export type LectraxPaymentMethod = "orange_money" | "afrimoney" | "visa_card";

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
    description: "Pay with Orange Money via USSD on your phone",
    channel: "momo",
    providerId: "m17",
  },
  {
    id: "afrimoney",
    label: "Afrimoney",
    description: "Pay with Afrimoney via USSD on your phone",
    channel: "momo",
    providerId: "m18",
  },
  {
    id: "visa_card",
    label: "Visa / Card",
    description: "Pay securely with debit or credit card",
    channel: "card",
  },
];

export function getPaymentMethodOption(id: LectraxPaymentMethod): PaymentMethodOption | undefined {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.id === id);
}

export const PAYMENT_METHOD_LABELS: Record<LectraxPaymentMethod, string> = {
  orange_money: "Orange Money",
  afrimoney: "Afrimoney",
  visa_card: "Visa / Card",
};
