"use client";

import { appFetch } from "@/lib/api/client-fetch";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Copy, Loader2, Smartphone } from "lucide-react";
import { useAsyncAction } from "@/hooks/use-async-action";
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
import type { PaymentMethodLogoId } from "@/lib/subscription/payment-method-logo-ids";
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

const PAYMENT_LOGO_CARD_CLASS =
  "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition-all duration-300 ease-out group-hover:scale-105 group-hover:shadow-md sm:h-24 sm:w-24 sm:p-3.5";

function shouldOptimizePaymentLogo(src: string): boolean {
  if (!/^https?:\/\//i.test(src)) return false;
  if (/\.svg(\?|$)/i.test(src)) return false;
  return true;
}

function PaymentMethodIcon({
  label,
  logoUrl,
}: {
  label: string;
  logoUrl: string | null | undefined;
}) {
  if (logoUrl) {
    const optimize = shouldOptimizePaymentLogo(logoUrl);
    return (
      <span className={PAYMENT_LOGO_CARD_CLASS}>
        <span className="relative h-full w-full">
          <Image
            src={logoUrl}
            alt={`${label} logo`}
            fill
            priority
            fetchPriority="high"
            decoding="async"
            unoptimized={!optimize}
            className="object-contain"
            sizes="96px"
          />
        </span>
      </span>
    );
  }

  return (
    <span className={PAYMENT_LOGO_CARD_CLASS}>
      <Smartphone className="h-9 w-9 text-accent sm:h-10 sm:w-10" aria-hidden />
    </span>
  );
}

const preloadedPaymentLogoUrls = new Set<string>();

function optimizedPaymentLogoHref(href: string, width = 128): string {
  const params = new URLSearchParams({
    url: href,
    w: String(width),
    q: "75",
  });
  return `/_next/image?${params.toString()}`;
}

/** Warm browser cache as soon as the subscription page mounts (before dialog opens). */
function preloadPaymentMethodLogos(
  logos: Record<PaymentMethodLogoId, string | null> | undefined
): void {
  if (typeof document === "undefined" || !logos) return;

  for (const href of Object.values(logos)) {
    if (!href || preloadedPaymentLogoUrls.has(href)) continue;
    preloadedPaymentLogoUrls.add(href);

    const preloadHref = shouldOptimizePaymentLogo(href)
      ? optimizedPaymentLogoHref(href)
      : href;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = preloadHref;
    document.head.appendChild(link);

    const img = new window.Image();
    img.decoding = "async";
    img.fetchPriority = "high";
    img.src = preloadHref;
  }
}

export function PaymentCheckoutFlow({
  open,
  onOpenChange,
  plan,
  onPaymentComplete,
  paymentMethodLogos,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: BillingPlan | null;
  planLabel: string;
  onPaymentComplete?: () => void;
  paymentMethodLogos?: Record<PaymentMethodLogoId, string | null>;
}) {
  const [step, setStep] = useState<"method" | "ussd">("method");
  const [selectedMethod, setSelectedMethod] = useState<LectraxPaymentMethod | null>(null);
  const { isPending: loading, run } = useAsyncAction();
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
    preloadPaymentMethodLogos(paymentMethodLogos);
  }, [paymentMethodLogos]);

  useEffect(() => {
    if (!ussdDetails || !polling) return;

    const interval = window.setInterval(() => {
      void (async () => {
        const res = await appFetch(`/api/payments/${ussdDetails.paymentId}/status`);
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string };
        if (data.status === "completed") {
          setPolling(false);
          onPaymentComplete?.();
          onOpenChange(false);
          window.location.href = `/lecturer/subscription?success=1`;
        }
      })();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [ussdDetails, polling, onOpenChange, onPaymentComplete]);

  function startCheckout() {
    if (!plan || !selectedMethod) return;

    setError(null);

    void run(async () => {
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
      }
    });
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
      <DialogContent
        className="gap-0 overflow-hidden p-0 md:max-w-[600px]"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        {step === "method" ? (
          <>
            <div className="shrink-0 border-b bg-background px-6 pb-4 pt-6 pr-12">
              <DialogHeader className="text-left">
                <DialogTitle>Choose payment method</DialogTitle>
                <DialogDescription>
                  {checkoutSummary}. Select how you want to pay.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              <div className="space-y-3">
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedMethod(option.id)}
                    className={`group flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors sm:gap-5 ${
                      selectedMethod === option.id
                        ? "border-accent bg-accent/5 ring-2 ring-accent"
                        : "hover:bg-muted"
                    }`}
                  >
                    <PaymentMethodIcon
                      label={option.label}
                      logoUrl={paymentMethodLogos?.[option.id as PaymentMethodLogoId]}
                    />
                    <div className="min-w-0">
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            </div>

            <div className="shrink-0 border-t bg-background px-6 py-4">
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  variant="accent"
                  loading={loading}
                  disabled={!selectedMethod}
                  onClick={() => void startCheckout()}
                >
                  Continue to Pay
                </Button>
              </DialogFooter>
            </div>
          </>
        ) : (
          <>
            <div className="shrink-0 border-b bg-background px-6 pb-4 pt-6 pr-12">
              <DialogHeader className="text-left">
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
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              <div className="space-y-4">
                <div className="rounded-lg border bg-slate-50 p-4 text-center">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    USSD Code
                  </p>
                  <p className="font-mono text-xl font-bold tracking-wide text-primary">
                    {ussdDetails?.ussdCode}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void copyUssd()}
                  >
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

              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            </div>

            <div className="shrink-0 border-t bg-background px-6 py-4">
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
