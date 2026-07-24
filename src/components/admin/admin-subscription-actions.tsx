"use client";

import { appFetch } from "@/lib/api/client-fetch";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BillingPlan } from "@/types/database";
import { useKeyedAsyncAction } from "@/hooks/use-async-action";

function hasActiveSubscriptionPeriod(
  plan: string,
  status: string,
  subscriptionEndDate: string | null
): boolean {
  return (
    plan === "premium" &&
    status === "active" &&
    !!subscriptionEndDate &&
    new Date(subscriptionEndDate) > new Date()
  );
}

export function AdminSubscriptionActions({
  lecturerId,
  plan,
  subscriptionStatus,
  subscriptionEndDate,
}: {
  lecturerId: string;
  plan: string;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
}) {
  const [billingPlan, setBillingPlan] = useState<BillingPlan>("monthly");
  const [days, setDays] = useState("30");
  const { pendingKey, isPending, run } = useKeyedAsyncAction<"activate" | "extend" | "revoke">();
  const activateBlocked = hasActiveSubscriptionPeriod(
    plan,
    subscriptionStatus,
    subscriptionEndDate
  );

  return (
    <div className="flex min-w-[280px] flex-wrap items-center gap-2">
      <Select value={billingPlan} onValueChange={(v) => setBillingPlan(v as BillingPlan)}>
        <SelectTrigger className="h-8 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="semester">Semester</SelectItem>
          <SelectItem value="annual">Academic year</SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="accent"
        loading={pendingKey === "activate"}
        disabled={isPending || activateBlocked}
        title={
          activateBlocked
            ? "Cannot activate while the lecturer has an active subscription period"
            : undefined
        }
        onClick={() => {
          if (activateBlocked) return;
          void run("activate", async () => {
            const res = await appFetch("/api/admin/subscriptions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lecturerId, billingPlan }),
            });
            if (res.ok) window.location.reload();
            else alert((await res.json()).error ?? "Failed to activate");
          });
        }}
      >
        Activate
      </Button>
      <Select value={days} onValueChange={setDays}>
        <SelectTrigger className="h-8 w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30">+30d</SelectItem>
          <SelectItem value="90">+90d</SelectItem>
          <SelectItem value="120">+120d</SelectItem>
          <SelectItem value="240">+240d</SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        loading={pendingKey === "extend"}
        disabled={isPending}
        onClick={() =>
          void run("extend", async () => {
            const res = await appFetch("/api/admin/subscriptions", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lecturerId, days: Number(days) }),
            });
            if (res.ok) window.location.reload();
            else alert((await res.json()).error ?? "Failed to extend");
          })
        }
      >
        Extend
      </Button>
      {plan === "premium" && (
        <Button
          size="sm"
          variant="destructive"
          loading={pendingKey === "revoke"}
          disabled={isPending}
          onClick={() => {
            if (!confirm("Revoke premium and revert this lecturer to the free plan?")) return;
            void run("revoke", async () => {
              const res = await appFetch("/api/admin/subscriptions", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lecturerId }),
              });
              if (res.ok) window.location.reload();
              else alert((await res.json()).error ?? "Failed to revoke");
            });
          }}
        >
          Revoke
        </Button>
      )}
    </div>
  );
}

/** @deprecated Use AdminSubscriptionActions */
export function AdminExtendSubscriptionButton({}: { subscriptionId: string }) {
  return (
    <span className="text-xs text-muted-foreground">Use subscription actions (profile-based)</span>
  );
}

/** @deprecated Use AdminSubscriptionActions */
export function AdminFreePlanButton({ lecturerId }: { lecturerId: string }) {
  return (
    <AdminSubscriptionActions
      lecturerId={lecturerId}
      plan="free"
      subscriptionStatus="active"
      subscriptionEndDate={null}
    />
  );
}
