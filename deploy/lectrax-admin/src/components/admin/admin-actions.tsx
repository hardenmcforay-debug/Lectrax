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

export function AdminFreePlanButton({ lecturerId }: { lecturerId: string }) {
  const [days, setDays] = useState("240");
  const [loading, setLoading] = useState(false);

  async function grantFree() {
    setLoading(true);
    const res = await appFetch("/api/admin/grant-free", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lecturerId, days: Number(days) }),
    });
    setLoading(false);
    if (res.ok) window.location.reload();
    else alert((await res.json()).error ?? "Failed to grant free plan");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={days} onValueChange={setDays}>
        <SelectTrigger className="h-8 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30">30 days</SelectItem>
          <SelectItem value="120">4 months</SelectItem>
          <SelectItem value="180">6 months</SelectItem>
          <SelectItem value="240">8 months</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" variant="accent" disabled={loading} onClick={grantFree}>
        {loading ? "..." : "Grant free"}
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
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await appFetch("/api/admin/toggle-lecturer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lecturerId, isActive: !isActive }),
    });
    setLoading(false);
    if (res.ok) window.location.reload();
    else alert((await res.json()).error ?? "Failed to update lecturer");
  }

  return (
    <Button
      size="sm"
      variant={isActive ? "outline" : "destructive"}
      disabled={loading}
      onClick={toggle}
    >
      {loading ? "..." : isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}

export function AdminExtendSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(false);

  async function extend() {
    setLoading(true);
    const res = await appFetch("/api/admin/extend-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId, days: Number(days) }),
    });
    setLoading(false);
    if (res.ok) window.location.reload();
    else alert((await res.json()).error ?? "Failed to extend subscription");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={days} onValueChange={setDays}>
        <SelectTrigger className="h-8 w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30">+30d</SelectItem>
          <SelectItem value="90">+90d</SelectItem>
          <SelectItem value="180">+180d</SelectItem>
          <SelectItem value="240">+240d</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" disabled={loading} onClick={extend}>
        {loading ? "..." : "Extend"}
      </Button>
    </div>
  );
}
