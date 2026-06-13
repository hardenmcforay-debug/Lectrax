"use client";

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
  const [loading, setLoading] = useState<string | null>(null);
  const activateBlocked = hasActiveSubscriptionPeriod(
    plan,
    subscriptionStatus,
    subscriptionEndDate
  );

  async function activate() {
    if (activateBlocked) return;
    setLoading("activate");
    const res = await fetch("/api/admin/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lecturerId, billingPlan }),
    });
    setLoading(null);
    if (res.ok) window.location.reload();
    else alert((await res.json()).error ?? "Failed to activate");
  }

  async function extend() {
    setLoading("extend");
    const res = await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lecturerId, days: Number(days) }),
    });
    setLoading(null);
    if (res.ok) window.location.reload();
    else alert((await res.json()).error ?? "Failed to extend");
  }

  async function revoke() {
    if (!confirm("Revoke premium and revert this lecturer to the free plan?")) return;
    setLoading("revoke");
    const res = await fetch("/api/admin/subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lecturerId }),
    });
    setLoading(null);
    if (res.ok) window.location.reload();
    else alert((await res.json()).error ?? "Failed to revoke");
  }

  return (
    <div className="flex min-w-[280px] flex-wrap items-center gap-2">
      <Select value={billingPlan} onValueChange={(v) => setBillingPlan(v as BillingPlan)}>
        <SelectTrigger className="h-8 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="semester">Semester</SelectItem>
          <SelectItem value="annual">Annual</SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="accent"
        disabled={loading !== null || activateBlocked}
        title={
          activateBlocked
            ? "Cannot activate while the lecturer has an active subscription period"
            : undefined
        }
        onClick={() => void activate()}
      >
        {loading === "activate" ? "..." : "Activate"}
      </Button>
      <Select value={days} onValueChange={setDays}>
        <SelectTrigger className="h-8 w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30">+30d</SelectItem>
          <SelectItem value="90">+90d</SelectItem>
          <SelectItem value="120">+120d</SelectItem>
          <SelectItem value="365">+365d</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" disabled={loading !== null} onClick={() => void extend()}>
        {loading === "extend" ? "..." : "Extend"}
      </Button>
      {plan === "premium" && (
        <Button
          size="sm"
          variant="destructive"
          disabled={loading !== null}
          onClick={() => void revoke()}
        >
          {loading === "revoke" ? "..." : "Revoke"}
        </Button>
      )}
    </div>
  );
}

/** @deprecated Use AdminSubscriptionActions */
export function AdminExtendSubscriptionButton(_props: { subscriptionId: string }) {
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
