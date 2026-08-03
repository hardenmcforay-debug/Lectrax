"use client";

import { useCallback, useEffect, useState } from "react";
import { TriangleAlert, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PARTNERSHIP_PAYMENT_PACKAGES,
  type PartnershipPaymentPackage,
} from "@/lib/partnerships/constants";
import type { PaymentMethodLogoId } from "@/lib/subscription/payment-method-logo-ids";
import { PartnershipPaymentModal } from "@/components/partnerships/partnership-payment-modal";
import {
  LandingReveal,
  LandingStagger,
  LandingStaggerItem,
} from "@/components/landing/landing-motion";
import { appFetch } from "@/lib/api/client-fetch";
import { cn } from "@/lib/utils";

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

async function fetchPaymentStatus(paymentId: string): Promise<{
  status?: string;
  payment?: PaymentReceipt;
}> {
  const res = await appFetch(`/api/partnerships/payments/${paymentId}/status`);
  if (!res.ok) return { status: "failed" };
  return (await res.json()) as { status?: string; payment?: PaymentReceipt };
}

function matchPackage(receipt?: PaymentReceipt | null): PartnershipPaymentPackage {
  const matched = PARTNERSHIP_PAYMENT_PACKAGES.find(
    (pkg) => pkg.name === receipt?.packageName
  );
  return matched ?? PARTNERSHIP_PAYMENT_PACKAGES[1] ?? PARTNERSHIP_PAYMENT_PACKAGES[0];
}

function readPaymentReturnQuery(): {
  outcome: string | null;
  paymentId: string | null;
} {
  if (typeof window === "undefined") {
    return { outcome: null, paymentId: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    outcome: params.get("payment"),
    paymentId: params.get("ref"),
  };
}

export function PartnershipPaymentSection({
  paymentMethodLogos,
}: {
  paymentMethodLogos?: Record<PaymentMethodLogoId, string | null>;
}) {
  const [paymentQuery] = useState(readPaymentReturnQuery);
  const [selectedPackage, setSelectedPackage] = useState<PartnershipPaymentPackage | null>(() => {
    if (paymentQuery.outcome === "cancelled" || paymentQuery.outcome === "failed") {
      return matchPackage(null);
    }
    return null;
  });
  const [modalOpen, setModalOpen] = useState(
    () => paymentQuery.outcome === "cancelled" || paymentQuery.outcome === "failed"
  );
  const [initialView, setInitialView] = useState<ModalView>(() => {
    if (paymentQuery.outcome === "cancelled") return "cancelled";
    if (paymentQuery.outcome === "failed") return "failed";
    return "checkout";
  });
  const [initialReceipt, setInitialReceipt] = useState<PaymentReceipt | null>(null);
  const [confirmingReturn, setConfirmingReturn] = useState(
    () => paymentQuery.outcome === "success" && Boolean(paymentQuery.paymentId)
  );

  const clearPaymentQuery = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("payment") && !url.searchParams.has("ref")) return;
    url.searchParams.delete("payment");
    url.searchParams.delete("ref");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    if (paymentQuery.outcome === "cancelled" || paymentQuery.outcome === "failed") {
      clearPaymentQuery();
      return;
    }

    const paymentId = paymentQuery.paymentId;
    if (paymentQuery.outcome !== "success" || !paymentId) return;

    let cancelled = false;

    void (async () => {
      try {
        let attempts = 0;
        let result = await fetchPaymentStatus(paymentId);

        while (
          !cancelled &&
          attempts < 8 &&
          result.status !== "completed" &&
          result.status !== "failed"
        ) {
          await new Promise((resolve) => window.setTimeout(resolve, 2000));
          if (cancelled) return;
          result = await fetchPaymentStatus(paymentId);
          attempts += 1;
        }

        if (cancelled) return;

        if (result.status === "completed" && result.payment) {
          setSelectedPackage(matchPackage(result.payment));
          setInitialReceipt(result.payment);
          setInitialView("success");
          setModalOpen(true);
        } else if (result.status === "failed") {
          setSelectedPackage(matchPackage(null));
          setInitialView("failed");
          setModalOpen(true);
        } else {
          setSelectedPackage(matchPackage(null));
          setInitialView("cancelled");
          setModalOpen(true);
        }
      } catch {
        if (!cancelled) {
          setSelectedPackage(matchPackage(null));
          setInitialView("cancelled");
          setModalOpen(true);
        }
      } finally {
        if (!cancelled) {
          setConfirmingReturn(false);
          clearPaymentQuery();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearPaymentQuery, paymentQuery]);

  function choosePackage(pkg: PartnershipPaymentPackage) {
    setSelectedPackage(pkg);
    setInitialView("checkout");
    setInitialReceipt(null);
    setModalOpen(true);
  }

  return (
    <section
      id="partnership-payment"
      className="scroll-mt-24 border-t border-slate-200/80 bg-gradient-to-b from-white via-slate-50/50 to-white py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <LandingReveal className="mb-10">
          <div
            role="note"
            className="rounded-2xl border-2 border-amber-400 bg-amber-50 px-5 py-5 shadow-md shadow-amber-200/60 ring-4 ring-amber-200/50 sm:px-6 sm:py-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950 shadow-sm">
                <TriangleAlert className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold tracking-tight text-amber-950 sm:text-lg">
                  Important: Complete the inquiry form before paying
                </p>
                <p className="mt-2 text-sm leading-relaxed text-amber-950/85 sm:text-base">
                  Please fill out the partnership inquiry form above and wait to hear from our team
                  before making a payment. Our team will confirm your package and guide you through
                  onboarding.
                </p>
              </div>
            </div>
          </div>
        </LandingReveal>

        <LandingReveal className="mb-10 text-center sm:mb-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            University Partnership Payment
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Choose Your Partnership Package
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            Select the package that best fits your department or institution and complete your
            partnership payment securely through Lectrax.
          </p>
        </LandingReveal>

        {confirmingReturn && (
          <div className="mb-8 flex items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Confirming your partnership payment…
          </div>
        )}

        <LandingStagger className="grid gap-6 lg:grid-cols-3">
          {PARTNERSHIP_PAYMENT_PACKAGES.map((pkg) => (
            <LandingStaggerItem
              key={pkg.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-8",
                pkg.popular
                  ? "border-2 border-accent ring-1 ring-accent/20 lg:scale-[1.02]"
                  : "border-slate-200"
              )}
            >
              {pkg.popular && (
                <Badge variant="accent" className="absolute -top-3 left-8">
                  Most Popular
                </Badge>
              )}

              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900">{pkg.name}</h3>
                <p className="mt-6 text-4xl font-bold tracking-tight text-slate-900">
                  ${pkg.price.toLocaleString("en-US")}
                  <span className="text-base font-normal text-slate-500"> / Academic Year</span>
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{pkg.description}</p>

                <p className="mt-6 text-sm font-semibold text-slate-900">{pkg.includesLabel}</p>
                <ul className="mt-3 space-y-2.5">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10">
                        <Check className="h-3 w-3 text-accent" aria-hidden />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className={cn(
                  "mt-8 h-11 w-full rounded-xl text-sm font-semibold transition-all",
                  pkg.popular
                    ? "bg-[#1455C4] text-white shadow-md shadow-blue-500/20 hover:bg-[#0B3D91]"
                    : "bg-primary text-white hover:bg-primary/90"
                )}
                onClick={() => choosePackage(pkg)}
              >
                Choose Package
              </Button>
            </LandingStaggerItem>
          ))}
        </LandingStagger>
      </div>

      <PartnershipPaymentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        selectedPackage={selectedPackage}
        paymentMethodLogos={paymentMethodLogos}
        initialView={initialView}
        initialReceipt={initialReceipt}
        onReturnToPackages={clearPaymentQuery}
      />
    </section>
  );
}
