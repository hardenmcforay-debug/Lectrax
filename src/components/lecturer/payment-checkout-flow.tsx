"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BillingPlan } from "@/types/database";
import {
  DEFAULT_SLE_CHARGE_AMOUNTS,
  formatCheckoutChargeSummary,
  formatSleChargeAmount,
} from "@/lib/subscription/payment-currency";
import {
  PAYMENT_METHOD_OPTIONS,
  type LectraxPaymentMethod,
} from "@/lib/monime/payment-methods";
import { platformFetch } from "@/lib/api/fetch";
import { ERROR_MESSAGES } from "@/lib/errors/messages";

type CheckoutResponse =
  | { kind: "redirect"; checkoutUrl: string; paymentId: string }
  | {
      kind: "ussd";
      paymentId: string;
      ussdCode: string;
      providerLabel: string;
      amountMajor: number;
      currency: string;
    };

export function PaymentCheckoutFlow({
  open,
  onOpenChange,
  plan,
  onPaymentComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: BillingPlan | null;
  planLabel: string;
  onPaymentComplete?: () => void;
}) {
  const [step, setStep] = useState<"method" | "ussd">("method");
  const [selectedMethod, setSelectedMethod] = useState<LectraxPaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ussdDetails, setUssdDetails] = useState<Extract<CheckoutResponse, { kind: "ussd" }> | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("method");
      setSelectedMethod(null);
      setError(null);
      setUssdDetails(null);
      setCopied(false);
      setPolling(false);
    }
  }, [open]);

  useEffect(() => {
    if (!ussdDetails || !polling) return;

    const interval = window.setInterval(() => {
      void (async () => {
        const res = await fetch(`/api/payments/${ussdDetails.paymentId}/status`);
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string };
        if (data.status === "completed") {
          setPolling(false);
          onPaymentComplete?.();
          onOpenChange(false);
          window.location.href = `/lecturer/subscription?success=1&payment=${ussdDetails.paymentId}`;
        }
      })();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [ussdDetails, polling, onOpenChange, onPaymentComplete]);

  async function startCheckout() {
    if (!plan || !selectedMethod) return;

    setLoading(true);
    setError(null);

    try {
      const result = await platformFetch<CheckoutResponse & { error?: string }>(
        "/api/payments/checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, paymentMethod: selectedMethod }),
        }
      );

      if (!result.ok) {
        const paymentMessage =
          result.error.category === "payment"
            ? `${ERROR_MESSAGES.payment.title}. ${ERROR_MESSAGES.payment.description}`
            : result.error.userMessage;
        setError(paymentMessage);
        return;
      }

      const data = result.data;

      if (data.kind === "redirect" && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data.kind === "ussd") {
        setUssdDetails(data);
        setStep("ussd");
        setPolling(true);
        return;
      }

      setError("Unexpected payment response. Please try again.");
    } catch {
      setError(`${ERROR_MESSAGES.payment.title}. ${ERROR_MESSAGES.payment.description}`);
    } finally {
      setLoading(false);
    }
  }

  async function copyUssd() {
    if (!ussdDetails?.ussdCode) return;
    await navigator.clipboard.writeText(ussdDetails.ussdCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const sleAmount = plan ? DEFAULT_SLE_CHARGE_AMOUNTS[plan] : 0;
  const checkoutSummary = plan ? formatCheckoutChargeSummary(plan) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {step === "method" ? (
          <>
            <DialogHeader>
              <DialogTitle>Choose payment method</DialogTitle>
              <DialogDescription>
                {checkoutSummary}. Select how you want to pay — Monime will charge{" "}
                {plan ? formatSleChargeAmount(plan) : "in leones"}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedMethod(option.id)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                    selectedMethod === option.id
                      ? "border-accent bg-accent/5 ring-2 ring-accent"
                      : "hover:bg-muted"
                  }`}
                >
                  <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="accent"
                disabled={!selectedMethod || loading}
                onClick={() => void startCheckout()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to Pay"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Complete payment on your phone</DialogTitle>
              <DialogDescription>
                Dial the USSD code below using{" "}
                {ussdDetails?.providerLabel ?? "your mobile money"} to pay{" "}
                {ussdDetails
                  ? formatSleChargeAmount(plan ?? "monthly", ussdDetails.amountMajor)
                  : "Monime"}
                .
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-slate-50 p-4 text-center">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">USSD Code</p>
                <p className="font-mono text-xl font-bold tracking-wide text-primary">
                  {ussdDetails?.ussdCode}
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => void copyUssd()}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? "Copied!" : "Copy code"}
                </Button>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Amount due:</span>{" "}
                  {ussdDetails
                    ? formatSleChargeAmount(plan ?? "monthly", ussdDetails.amountMajor)
                    : formatSleChargeAmount(plan ?? "monthly", sleAmount)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Method:</span>{" "}
                  {ussdDetails?.providerLabel}
                </p>
              </div>

              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Open your phone dialer</li>
                <li>Dial the USSD code exactly as shown</li>
                <li>Follow the prompts to confirm payment</li>
                <li>Your Lectrax Premium plan activates automatically after payment</li>
              </ol>

              {polling && (
                <Badge variant="secondary" className="flex w-fit items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Waiting for payment confirmation…
                </Badge>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
