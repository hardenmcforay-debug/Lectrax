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
import { useAsyncAction } from "@/hooks/use-async-action";
import { DeferredSelect } from "@/components/shared/deferred-select";

const FREE_PLAN_LABELS: Record<string, string> = {
  "30": "30 days",
  "120": "4 months",
  "180": "6 months",
  "300": "10 months",
};

const EXTEND_LABELS: Record<string, string> = {
  "30": "+30d",
  "90": "+90d",
  "180": "+180d",
  "300": "+300d",
};

export function AdminFreePlanButton({ lecturerId }: { lecturerId: string }) {
  const [days, setDays] = useState("300");
  const { isPending, run } = useAsyncAction();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DeferredSelect
        placeholderLabel={FREE_PLAN_LABELS[days] ?? "10 months"}
        triggerClassName="h-8 w-28"
        className="w-28"
      >
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="h-8 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="120">4 months</SelectItem>
            <SelectItem value="180">6 months</SelectItem>
            <SelectItem value="300">10 months</SelectItem>
          </SelectContent>
        </Select>
      </DeferredSelect>
      <Button
        size="sm"
        variant="accent"
        loading={isPending}
        onClick={() =>
          void run(async () => {
            const res = await appFetch("/api/admin/grant-free", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lecturerId, days: Number(days) }),
            });
            if (res.ok) window.location.reload();
            else alert((await res.json()).error ?? "Failed to grant free plan");
          })
        }
      >
        Grant free
      </Button>
    </div>
  );
}

export function AdminToggleLecturerButton({
  lecturerId,
  isActive,
}: {
  lecturerId: string;
  isActive: boolean;
}) {
  const { isPending, run } = useAsyncAction();

  return (
    <Button
      size="sm"
      variant={isActive ? "outline" : "destructive"}
      loading={isPending}
      onClick={() =>
        void run(async () => {
          const res = await appFetch("/api/admin/toggle-lecturer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lecturerId, isActive: !isActive }),
          });
          if (res.ok) window.location.reload();
          else alert((await res.json()).error ?? "Failed to update lecturer");
        })
      }
    >
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}

export function AdminExtendSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [days, setDays] = useState("30");
  const { isPending, run } = useAsyncAction();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DeferredSelect
        placeholderLabel={EXTEND_LABELS[days] ?? "+30d"}
        triggerClassName="h-8 w-24"
        className="w-24"
      >
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="h-8 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">+30d</SelectItem>
            <SelectItem value="90">+90d</SelectItem>
            <SelectItem value="180">+180d</SelectItem>
            <SelectItem value="300">+300d</SelectItem>
          </SelectContent>
        </Select>
      </DeferredSelect>
      <Button
        size="sm"
        variant="outline"
        loading={isPending}
        onClick={() =>
          void run(async () => {
            const res = await appFetch("/api/admin/extend-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subscriptionId, days: Number(days) }),
            });
            if (res.ok) window.location.reload();
            else alert((await res.json()).error ?? "Failed to extend subscription");
          })
        }
      >
        Extend
      </Button>
    </div>
  );
}
