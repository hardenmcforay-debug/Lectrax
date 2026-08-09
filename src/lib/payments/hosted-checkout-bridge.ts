/** postMessage bridge when Monime returns inside an in-app checkout iframe. */
export const LECTRAX_PAYMENT_RETURN_MESSAGE = "lectrax-payment-return" as const;

export type LectraxPaymentReturnMessage = {
  source: typeof LECTRAX_PAYMENT_RETURN_MESSAGE;
  outcome: "success" | "cancelled";
  dest: string;
};

export function isLectraxPaymentReturnMessage(
  data: unknown
): data is LectraxPaymentReturnMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as Partial<LectraxPaymentReturnMessage>;
  return (
    msg.source === LECTRAX_PAYMENT_RETURN_MESSAGE &&
    (msg.outcome === "success" || msg.outcome === "cancelled") &&
    typeof msg.dest === "string"
  );
}
