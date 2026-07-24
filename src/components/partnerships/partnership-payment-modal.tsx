"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Download, Loader2, Smartphone, XCircle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  partnershipCheckoutSchema,
  type PartnershipCheckoutInput,
} from "@/lib/validations";
import type { PartnershipPaymentPackage } from "@/lib/partnerships/constants";
import {
  DEFAULT_PARTNERSHIP_SLE_AMOUNTS,
  PARTNERSHIP_PAYMENT_SUCCESS_MESSAGE,
} from "@/lib/partnerships/constants";
import {
  formatPartnershipLocalCheckoutSummary,
  formatPartnershipSleAmount,
} from "@/lib/partnerships/payment-currency";
import {
  getPaymentMethodOption,
  PAYMENT_METHOD_OPTIONS,
  type LectraxPaymentMethod,
} from "@/lib/monime/payment-methods";
import type { PaymentMethodLogoId } from "@/lib/subscription/payment-method-logo-ids";
import { platformFetch } from "@/lib/api/fetch";
import { appFetch } from "@/lib/api/client-fetch";
import { useAsyncAction } from "@/hooks/use-async-action";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import { cn } from "@/lib/utils";

type CheckoutResponse =
  | { kind: "redirect"; checkoutUrl: string; paymentId: string }
  | {
      kind: "ussd";
      paymentId: string;
      ussdCode: string;
      providerLabel: string;
      amountMajor: number;
      currency: string;
      packageName?: string;
      displayAmountUsd?: number;
    };

type PaymentReceipt = {
  id: string;
  packageName: string;
  displayAmountUsd: number;
  universityName: string;
  departmentName: string;
  contactPerson: string;
  email: string;
  phoneNumber: string;
  country: string;
  paidAt: string | null;
  billingCycle: string;
};

type ModalView = "checkout" | "ussd" | "success" | "failed" | "cancelled";

const formInputClass =
  "h-11 rounded-xl border-slate-200 bg-white px-4 text-sm transition-all placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

const formLabelClass = "text-sm font-medium text-slate-700";

const PAYMENT_LOGO_CARD_CLASS =
  "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm transition-all duration-300 ease-out group-hover:scale-105 group-hover:shadow-md sm:h-20 sm:w-20";

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
            decoding="async"
            unoptimized={!optimize}
            className="object-contain"
            sizes="80px"
          />
        </span>
      </span>
    );
  }

  return (
    <span className={PAYMENT_LOGO_CARD_CLASS}>
      <Smartphone className="h-8 w-8 text-accent" aria-hidden />
    </span>
  );
}

function downloadReceipt(receipt: PaymentReceipt) {
  const paidAt = receipt.paidAt
    ? new Date(receipt.paidAt).toLocaleString()
    : new Date().toLocaleString();

  const lines = [
    "LECTRAX — UNIVERSITY PARTNERSHIP RECEIPT",
    "========================================",
    "",
    `Receipt / Reference: ${receipt.id}`,
    `Date: ${paidAt}`,
    "",
    "PACKAGE",
    `  ${receipt.packageName}`,
    `  Billing cycle: ${
      receipt.billingCycle === "yearly" || receipt.billingCycle === "Year"
        ? "Academic Year"
        : receipt.billingCycle
    }`,
    `  Amount: $${Number(receipt.displayAmountUsd).toLocaleString()} USD / Academic Year`,
    `  Processing fee: $0`,
    `  Total: $${Number(receipt.displayAmountUsd).toLocaleString()} USD`,
    "",
    "INSTITUTION",
    `  University: ${receipt.universityName}`,
    `  Faculty/Department: ${receipt.departmentName}`,
    `  Contact: ${receipt.contactPerson}`,
    `  Email: ${receipt.email}`,
    `  Phone: ${receipt.phoneNumber}`,
    `  Country: ${receipt.country}`,
    "",
    "Thank you for partnering with Lectrax.",
    "Our team will contact you shortly to begin onboarding.",
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `lectrax-partnership-receipt-${receipt.id.slice(0, 8)}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function PartnershipPaymentModal({
  open,
  onOpenChange,
  selectedPackage,
  paymentMethodLogos,
  initialView = "checkout",
  initialReceipt = null,
  onReturnToPackages,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPackage: PartnershipPaymentPackage | null;
  paymentMethodLogos?: Record<PaymentMethodLogoId, string | null>;
  initialView?: ModalView;
  initialReceipt?: PaymentReceipt | null;
  onReturnToPackages?: () => void;
}) {
  const [view, setView] = useState<ModalView>(initialView);
  const [selectedMethod, setSelectedMethod] = useState<LectraxPaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ussdDetails, setUssdDetails] = useState<Extract<CheckoutResponse, { kind: "ussd" }> | null>(
    null
  );
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(initialReceipt);
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(false);
  const { isPending: loading, run } = useAsyncAction();

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<Omit<PartnershipCheckoutInput, "packageId" | "paymentMethod">>({
    resolver: zodResolver(
      partnershipCheckoutSchema.omit({ packageId: true, paymentMethod: true })
    ),
    defaultValues: {
      universityName: "",
      departmentName: "",
      contactPerson: "",
      email: "",
      phoneNumber: "",
      country: "",
    },
  });

  useEffect(() => {
    if (!open) {
      setView("checkout");
      setSelectedMethod(null);
      setError(null);
      setUssdDetails(null);
      setCopied(false);
      setPolling(false);
      setReceipt(null);
      reset();
      return;
    }

    setView(initialView);
    if (initialReceipt) setReceipt(initialReceipt);
  }, [open, initialView, initialReceipt, reset]);

  useEffect(() => {
    if (!ussdDetails || !polling) return;

    const interval = window.setInterval(() => {
      void (async () => {
        const res = await appFetch(`/api/partnerships/payments/${ussdDetails.paymentId}/status`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          status?: string;
          payment?: PaymentReceipt;
        };
        if (data.status === "completed") {
          setPolling(false);
          if (data.payment) setReceipt(data.payment);
          setView("success");
        } else if (data.status === "failed") {
          setPolling(false);
          setView("failed");
        }
      })();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [ussdDetails, polling]);

  const processingFee = 0;
  const total = selectedPackage?.price ?? 0;
  const selectedMethodOption = selectedMethod
    ? getPaymentMethodOption(selectedMethod)
    : null;
  const isLocalUssdMethod = selectedMethodOption?.channel === "momo";
  const sleAmount = selectedPackage
    ? DEFAULT_PARTNERSHIP_SLE_AMOUNTS[selectedPackage.id]
    : 0;

  const summaryRows = useMemo(() => {
    const amountValue = !selectedPackage
      ? "—"
      : isLocalUssdMethod
        ? formatPartnershipLocalCheckoutSummary(selectedPackage.id, sleAmount)
        : `$${selectedPackage.price.toLocaleString()}`;

    const totalValue = !selectedPackage
      ? "—"
      : isLocalUssdMethod
        ? formatPartnershipSleAmount(sleAmount)
        : `$${total.toLocaleString()}`;

    return [
      { label: "Selected Package", value: selectedPackage?.name ?? "—" },
      { label: "Duration", value: "1 Academic Year" },
      {
        label: "Amount",
        value: amountValue,
      },
      {
        label: "Processing Fee",
        value: processingFee > 0 ? `$${processingFee}` : "None",
      },
      {
        label: "Total",
        value: totalValue,
        emphasize: true,
      },
    ];
  }, [selectedPackage, total, isLocalUssdMethod, sleAmount]);

  function proceedToPayment(
    formData: Omit<PartnershipCheckoutInput, "packageId" | "paymentMethod">
  ) {
    if (!selectedPackage || !selectedMethod) {
      setError("Please select a payment method.");
      return;
    }

    setError(null);

    void run(async () => {
      try {
        const result = await platformFetch<CheckoutResponse & { error?: string }>(
          "/api/partnerships/checkout",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              packageId: selectedPackage.id,
              paymentMethod: selectedMethod,
              ...formData,
            }),
          }
        );

        if (!result.ok) {
          const paymentMessage =
            result.error.category === "payment"
              ? `${ERROR_MESSAGES.payment.title}. ${ERROR_MESSAGES.payment.description}`
              : result.error.userMessage;
          setError(paymentMessage);
          setView("failed");
          return;
        }

        const data = result.data;

        if (data.kind === "redirect" && data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }

        if (data.kind === "ussd") {
          setUssdDetails(data);
          setView("ussd");
          setPolling(true);
          return;
        }

        setError("Unexpected payment response. Please try again.");
        setView("failed");
      } catch {
        setError(`${ERROR_MESSAGES.payment.title}. ${ERROR_MESSAGES.payment.description}`);
        setView("failed");
      }
    });
  }

  async function copyUssd() {
    if (!ussdDetails?.ussdCode) return;
    await navigator.clipboard.writeText(ussdDetails.ussdCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function handleTryAgain() {
    setError(null);
    setView("checkout");
    setUssdDetails(null);
    setPolling(false);
  }

  function handleReturn() {
    onOpenChange(false);
    onReturnToPackages?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 md:max-w-[640px]"
        onPointerDownOutside={(event) => {
          if (loading || polling) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (loading || polling) event.preventDefault();
        }}
      >
        {view === "checkout" && selectedPackage && (
          <>
            <div className="shrink-0 border-b bg-background px-6 pb-4 pt-6 pr-12">
              <DialogHeader className="text-left">
                <DialogTitle>University Partnership Payment</DialogTitle>
                <DialogDescription>
                  Confirm your institution details and complete payment securely through Lectrax.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Selected Package
                  </p>
                  <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{selectedPackage.name}</p>
                      <p className="text-sm text-slate-600">Billing Cycle: Academic Year</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      ${selectedPackage.price.toLocaleString()}
                      <span className="text-sm font-normal text-slate-500"> / Academic Year</span>
                    </p>
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Institution Information
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="universityName" className={formLabelClass}>
                        University Name
                      </Label>
                      <Input
                        id="universityName"
                        className={cn(formInputClass, "mt-1.5")}
                        placeholder="e.g. University of Sierra Leone"
                        {...register("universityName")}
                      />
                      {errors.universityName && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.universityName.message}
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="departmentName" className={formLabelClass}>
                        Faculty/Department
                      </Label>
                      <Input
                        id="departmentName"
                        className={cn(formInputClass, "mt-1.5")}
                        placeholder="e.g. Faculty of Engineering"
                        {...register("departmentName")}
                      />
                      {errors.departmentName && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.departmentName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="contactPerson" className={formLabelClass}>
                        Contact Person
                      </Label>
                      <Input
                        id="contactPerson"
                        className={cn(formInputClass, "mt-1.5")}
                        placeholder="Full name"
                        {...register("contactPerson")}
                      />
                      {errors.contactPerson && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.contactPerson.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber" className={formLabelClass}>
                        Phone Number
                      </Label>
                      <Input
                        id="phoneNumber"
                        className={cn(formInputClass, "mt-1.5")}
                        placeholder="+232 ..."
                        {...register("phoneNumber")}
                      />
                      {errors.phoneNumber && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.phoneNumber.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email" className={formLabelClass}>
                        Official University Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        className={cn(formInputClass, "mt-1.5")}
                        placeholder="name@university.edu"
                        {...register("email")}
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="country" className={formLabelClass}>
                        Country
                      </Label>
                      <Input
                        id="country"
                        className={cn(formInputClass, "mt-1.5")}
                        placeholder="e.g. Sierra Leone"
                        {...register("country")}
                      />
                      {errors.country && (
                        <p className="mt-1 text-xs text-destructive">{errors.country.message}</p>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Payment Method</h3>
                  <div className="space-y-3">
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedMethod(option.id)}
                        className={cn(
                          "group flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all sm:gap-5",
                          selectedMethod === option.id
                            ? "border-accent bg-accent/5 ring-2 ring-accent/30"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        )}
                      >
                        <PaymentMethodIcon
                          label={option.label}
                          logoUrl={paymentMethodLogos?.[option.id as PaymentMethodLogoId]}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{option.label}</p>
                          <p className="text-sm text-slate-500">
                            {option.channel === "momo"
                              ? "Monime will provide a USSD code to dial on your phone"
                              : option.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {isLocalUssdMethod && (
                    <p className="mt-3 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5 text-sm text-slate-700">
                      After you continue, Monime generates a USSD code for{" "}
                      <span className="font-medium text-slate-900">
                        {selectedMethodOption?.label}
                      </span>
                      . Dial it on your phone to complete payment of{" "}
                      <span className="font-medium text-slate-900">
                        {formatPartnershipSleAmount(sleAmount)}
                      </span>
                      .
                    </p>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Payment Summary</h3>
                  <dl className="space-y-2.5">
                    {summaryRows.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <dt className="text-slate-500">{row.label}</dt>
                        <dd
                          className={cn(
                            "font-medium text-slate-900",
                            row.emphasize && "text-base font-bold text-primary"
                          )}
                        >
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </div>

            <div className="shrink-0 border-t bg-background px-6 py-4">
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="accent"
                  loading={loading}
                  disabled={!selectedMethod}
                  onClick={() => {
                    void handleSubmit(proceedToPayment)();
                  }}
                >
                  {loading
                    ? isLocalUssdMethod
                      ? "Getting USSD code…"
                      : "Initializing payment…"
                    : isLocalUssdMethod
                      ? "Get USSD Code"
                      : "Proceed to Payment"}
                </Button>
              </DialogFooter>
            </div>
          </>
        )}

        {view === "ussd" && (
          <>
            <div className="shrink-0 border-b bg-background px-6 pb-4 pt-6 pr-12">
              <DialogHeader className="text-left">
                <DialogTitle>Complete payment with USSD</DialogTitle>
                <DialogDescription>
                  Monime generated a USSD code for{" "}
                  {ussdDetails?.providerLabel ?? "your mobile money"}. Dial it on your phone to
                  pay your partnership package.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              <div className="space-y-4">
                <div className="rounded-2xl border bg-slate-50 p-5 text-center">
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
                    <span className="font-medium text-foreground">Package:</span>{" "}
                    {selectedPackage?.name ?? ussdDetails?.packageName}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Amount due:</span>{" "}
                    {ussdDetails
                      ? formatPartnershipSleAmount(ussdDetails.amountMajor)
                      : selectedPackage
                        ? formatPartnershipSleAmount(
                            DEFAULT_PARTNERSHIP_SLE_AMOUNTS[selectedPackage.id]
                          )
                        : "—"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Method:</span>{" "}
                    {ussdDetails?.providerLabel}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Provider:</span> Monime USSD
                  </p>
                </div>

                <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Open your phone dialer</li>
                  <li>Dial the Monime USSD code exactly as shown</li>
                  <li>Follow the prompts to confirm payment with your local provider</li>
                  <li>Your partnership payment confirms automatically after success</li>
                </ol>

                {polling && (
                  <Badge variant="secondary" className="flex w-fit items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Waiting for payment confirmation…
                  </Badge>
                )}
              </div>
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

        {view === "success" && (
          <>
            <div className="shrink-0 border-b bg-background px-6 pb-4 pt-6 pr-12">
              <DialogHeader className="text-left">
                <DialogTitle className="flex items-center gap-2 text-emerald-700">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-5 w-5 text-emerald-600" />
                  </span>
                  Payment Successful
                </DialogTitle>
                <DialogDescription>{PARTNERSHIP_PAYMENT_SUCCESS_MESSAGE}</DialogDescription>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              {(receipt || selectedPackage) && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
                  <p className="font-semibold text-slate-900">
                    {receipt?.packageName ?? selectedPackage?.name}
                  </p>
                  <p className="mt-1 text-slate-600">
                    {receipt?.universityName ?? getValues("universityName")}
                  </p>
                  <p className="mt-2 font-medium text-primary">
                    $
                    {Number(
                      receipt?.displayAmountUsd ?? selectedPackage?.price ?? 0
                    ).toLocaleString()}{" "}
                    / Academic Year
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t bg-background px-6 py-4">
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleReturn}>
                  Return to Partnership Page
                </Button>
                <Button
                  variant="accent"
                  disabled={!receipt}
                  onClick={() => {
                    if (receipt) downloadReceipt(receipt);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Receipt
                </Button>
              </DialogFooter>
            </div>
          </>
        )}

        {view === "cancelled" && (
          <>
            <div className="shrink-0 border-b bg-background px-6 pb-4 pt-6 pr-12">
              <DialogHeader className="text-left">
                <DialogTitle className="flex items-center gap-2 text-slate-800">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                    <XCircle className="h-5 w-5 text-slate-500" />
                  </span>
                  Payment cancelled
                </DialogTitle>
                <DialogDescription>
                  You did not complete the payment. No payment has been deducted. You can return
                  anytime to choose a package and try again.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="shrink-0 border-t bg-background px-6 py-4">
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button variant="accent" onClick={handleTryAgain}>
                  Choose Package Again
                </Button>
              </DialogFooter>
            </div>
          </>
        )}

        {view === "failed" && (
          <>
            <div className="shrink-0 border-b bg-background px-6 pb-4 pt-6 pr-12">
              <DialogHeader className="text-left">
                <DialogTitle className="flex items-center gap-2 text-red-700">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </span>
                  Payment could not be completed
                </DialogTitle>
                <DialogDescription>
                  No payment has been deducted. Please try again or choose another payment method.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>

            <div className="shrink-0 border-t bg-background px-6 py-4">
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button variant="accent" onClick={handleTryAgain}>
                  Try Again
                </Button>
              </DialogFooter>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
