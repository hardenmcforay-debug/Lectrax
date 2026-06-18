"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { BillingPlan, Payment } from "@/types/database";
import {
  ACTIVE_SUBSCRIPTION_SUBSCRIBE_BLOCKED_MESSAGE,
  ADMIN_GRANTED_SUBSCRIBE_BLOCKED_MESSAGE,
  BILLING_PLANS,
} from "@/lib/subscription/constants";
import type { SubscriptionPageInitialData } from "@/lib/subscription/subscription-page-data";
import { lecturerPortalCardClass } from "@/components/lecturer/lecturer-dashboard-styles";
import { cn } from "@/lib/utils";
import { formatSleChargeAmount, formatUsdPrice } from "@/lib/subscription/payment-currency";
import { isAllowedPaymentCallbackFlag } from "@/lib/security/sanitize";
import { stripSensitiveUrlParams } from "@/lib/security/client-storage";
import { PaymentCheckoutFlow } from "@/components/lecturer/payment-checkout-flow";
import { Check, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const plans: { id: BillingPlan; label: string; description: string }[] = [
  { id: "monthly", label: BILLING_PLANS.monthly.label, description: BILLING_PLANS.monthly.description },
  { id: "semester", label: BILLING_PLANS.semester.label, description: BILLING_PLANS.semester.description },
  { id: "annual", label: BILLING_PLANS.annual.label, description: BILLING_PLANS.annual.description },
];

const premiumFeatures = [
  "Unlimited class sessions",
  "Unlimited students",
  "Two tests & assignments",
  "Student assignment submissions",
  "Analytics dashboard",
  "Audit logs",
];

function hasActiveSubscriptionPeriod(
  profile: SubscriptionPageInitialData["profile"]
): boolean {
  return (
    profile?.subscription_plan === "premium" &&
    profile.subscription_status === "active" &&
    !!profile.subscription_end_date &&
    new Date(profile.subscription_end_date) > new Date()
  );
}

export function SubscriptionPageContent({
  initialData,
}: {
  initialData: SubscriptionPageInitialData;
}) {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState(initialData.profile);
  const [payments, setPayments] = useState(initialData.payments);
  const [adminGrantedActive, setAdminGrantedActive] = useState(initialData.display.isAdminGranted);
  const [checkoutPlan, setCheckoutPlan] = useState<BillingPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<Payment | null>(null);
  const [deleteAllPaymentsOpen, setDeleteAllPaymentsOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState(false);
  const [deletingAllPayments, setDeletingAllPayments] = useState(false);
  const [deletePaymentError, setDeletePaymentError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/lecturer/subscription/sync", { method: "POST" }).catch(() => {});
    stripSensitiveUrlParams();
  }, []);

  async function refreshSubscriptionData() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: p } = await supabase
      .from("profiles")
      .select("subscription_plan, subscription_status, subscription_end_date, grace_period_end_date")
      .eq("id", user.id)
      .maybeSingle();

    const { data: pay } = await supabase
      .from("payments")
      .select(
        "id, amount, status, plan, billing_plan, created_at, paid_at, metadata, monime_payment_id"
      )
      .eq("lecturer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    let isAdminGranted = false;
    if (hasActiveSubscriptionPeriod(p)) {
      const { data: adminSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("lecturer_id", user.id)
        .eq("is_free_override", true)
        .not("granted_by", "is", null)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();

      isAdminGranted = !!adminSub;
    }

    setProfile(p);
    setAdminGrantedActive(isAdminGranted);
    setPayments((pay as Payment[]) ?? []);
  }

  function openCheckout(plan: BillingPlan) {
    if (activeSubscriptionPeriod) return;
    setCheckoutPlan(plan);
    setCheckoutOpen(true);
  }

  async function handleDeletePayment() {
    if (!deletePaymentTarget) return;
    setDeletePaymentError(null);
    setDeletingPayment(true);

    try {
      const res = await fetch(`/api/payments/${deletePaymentTarget.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setDeletePaymentError(data.error ?? "Could not delete payment record.");
        return;
      }

      setDeletePaymentTarget(null);
      await refreshSubscriptionData();
    } catch {
      setDeletePaymentError("Network error. Please try again.");
    } finally {
      setDeletingPayment(false);
    }
  }

  async function handleDeleteAllPayments() {
    setDeletePaymentError(null);
    setDeletingAllPayments(true);

    try {
      const res = await fetch("/api/payments", { method: "DELETE" });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setDeletePaymentError(data.error ?? "Could not delete payment records.");
        return;
      }

      setDeleteAllPaymentsOpen(false);
      await refreshSubscriptionData();
    } catch {
      setDeletePaymentError("Network error. Please try again.");
    } finally {
      setDeletingAllPayments(false);
    }
  }

  const checkoutPlanLabel = checkoutPlan
    ? plans.find((p) => p.id === checkoutPlan)?.label ?? "Premium"
    : "";

  const isPremium = profile?.subscription_plan === "premium";
  const status = profile?.subscription_status ?? "active";
  const activeSubscriptionPeriod = hasActiveSubscriptionPeriod(profile);
  const canSelfSubscribe = !activeSubscriptionPeriod;
  const deletablePayments = payments.filter((p) => p.status !== "completed");

  return (
    <DashboardShell
      role="lecturer"
      title="Subscription"
      description="Manage your subscription, billing, and access to premium features designed to support your academic activities."
    >
      {isAllowedPaymentCallbackFlag(searchParams.get("success")) && (
        <Badge variant="accent" className="mb-4">
          Payment successful! Your Lectrax Premium plan is activating…
        </Badge>
      )}
      {isAllowedPaymentCallbackFlag(searchParams.get("cancelled")) && (
        <Badge variant="secondary" className="mb-4">
          Payment cancelled.
        </Badge>
      )}

      {activeSubscriptionPeriod && (
        <Card className={cn(lecturerPortalCardClass, "mb-6 border-blue-200 bg-blue-50")}>
          <CardContent className="py-4">
            <p className="text-sm text-blue-900">
              {adminGrantedActive
                ? ADMIN_GRANTED_SUBSCRIBE_BLOCKED_MESSAGE
                : ACTIVE_SUBSCRIPTION_SUBSCRIBE_BLOCKED_MESSAGE}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="portal-stat-grid mb-8">
        <Card className={lecturerPortalCardClass}>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              {isPremium ? "Premium" : "Free"} — {status.replace("_", " ")}
              {isPremium && profile?.subscription_end_date && status === "active" && (
                <> — expires {new Date(profile.subscription_end_date).toLocaleDateString()}</>
              )}
              {status === "grace_period" && profile?.grace_period_end_date && (
                <> — grace until {new Date(profile.grace_period_end_date).toLocaleDateString()}</>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className={lecturerPortalCardClass}>
          <CardHeader>
            <CardTitle>Premium includes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {premiumFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {canSelfSubscribe && (
        <>
          <h2 className="mb-4 text-lg font-semibold">Upgrade to Lectrax Premium</h2>
          <div className="portal-stat-grid">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  lecturerPortalCardClass,
                  plan.id === "semester" && "border-accent ring-2 ring-accent"
                )}
              >
                <CardHeader>
                  {plan.id === "semester" && <Badge variant="accent">Best Value</Badge>}
                  <CardTitle>{plan.label}</CardTitle>
                  <CardDescription className="text-2xl font-bold text-foreground">
                    {formatUsdPrice(plan.id)}
                  </CardDescription>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Charged in leones at checkout via Monime
                  </p>
                </CardHeader>
                <CardFooter>
                  <Button className="w-full" variant="accent" onClick={() => openCheckout(plan.id)}>
                    Upgrade Plan
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}

      <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Payment History</h2>
        {deletablePayments.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              setDeletePaymentError(null);
              setDeleteAllPaymentsOpen(true);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete All
          </Button>
        )}
      </div>
      <ul className="space-y-2">
        {payments.length === 0 && (
          <li className="text-sm text-muted-foreground">No payments yet.</li>
        )}
        {payments.map((p) => {
          const billingPlan = (p.billing_plan ?? "monthly") as BillingPlan;
          const canDelete = p.status !== "completed";
          return (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded border p-3 text-sm"
            >
              <span>
                {billingPlan} — {formatUsdPrice(billingPlan)}{" "}
                <span className="text-muted-foreground">
                  ({formatSleChargeAmount(billingPlan, Number(p.amount))} paid)
                </span>{" "}
                {p.payment_method && (
                  <span className="text-muted-foreground">via {p.payment_method}</span>
                )}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={p.status === "completed" ? "accent" : "secondary"}>
                  {p.status}
                </Badge>
                {canDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete payment record"
                    onClick={() => {
                      setDeletePaymentError(null);
                      setDeletePaymentTarget(p);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={deleteAllPaymentsOpen}
        onOpenChange={(open) => {
          if (!open && !deletingAllPayments) {
            setDeleteAllPaymentsOpen(false);
            setDeletePaymentError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete all payment records?</DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-left">
              <span className="block">
                Remove all pending, failed, and refunded payment records from your history?
              </span>
              <span className="block">Completed payment records will be kept.</span>
              <span className="block">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          {deletePaymentError && deleteAllPaymentsOpen && (
            <p className="text-sm text-destructive">{deletePaymentError}</p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteAllPaymentsOpen(false)}
              disabled={deletingAllPayments}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteAllPayments()}
              disabled={deletingAllPayments}
            >
              {deletingAllPayments ? "Deleting..." : "Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletePaymentTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deletingPayment) {
            setDeletePaymentTarget(null);
            setDeletePaymentError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete payment record?</DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-left">
              <span className="block">
                This will permanently remove this payment record from your history.
              </span>
              <span className="block">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          {deletePaymentError && !deleteAllPaymentsOpen && (
            <p className="text-sm text-destructive">{deletePaymentError}</p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeletePaymentTarget(null)}
              disabled={deletingPayment}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeletePayment()}
              disabled={deletingPayment}
            >
              {deletingPayment ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentCheckoutFlow
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        plan={checkoutPlan}
        planLabel={checkoutPlanLabel}
        onPaymentComplete={() => void refreshSubscriptionData()}
      />
    </DashboardShell>
  );
}
