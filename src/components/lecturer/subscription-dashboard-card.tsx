"use client";

import Link from "next/link";
import { Crown, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SubscriptionDisplay } from "@/lib/subscription/types";
import { formatDate, cn } from "@/lib/utils";

/** Uses only display fields so server HTML matches client hydration (no Date.now()). */
function getProgressPercent(display: SubscriptionDisplay): number {
  const { subscriptionStartDate, expiryDate, daysRemaining } = display;
  if (subscriptionStartDate && expiryDate && daysRemaining !== null) {
    const start = new Date(subscriptionStartDate).getTime();
    const end = new Date(expiryDate).getTime();
    const totalMs = end - start;
    if (totalMs > 0) {
      const totalDays = totalMs / (1000 * 60 * 60 * 24);
      const percent = Math.min(100, Math.max(0, (daysRemaining / totalDays) * 100));
      return Math.round(percent * 10) / 10;
    }
  }
  if (daysRemaining !== null) {
    const percent = Math.min(100, Math.max(8, (daysRemaining / 365) * 100));
    return Math.round(percent * 10) / 10;
  }
  return 65;
}

function getStatusConfig(display: SubscriptionDisplay) {
  if (display.showExpiredBanner) {
    return {
      pill: "EXPIRED",
      pillClass: "bg-red-500/90 text-white",
      subtitle: "Renew required",
    };
  }
  if (display.showGraceBanner) {
    return {
      pill: "GRACE",
      pillClass: "bg-amber-500/90 text-white",
      subtitle: "Grace period",
    };
  }
  if (display.isFree) {
    return {
      pill: "FREE",
      pillClass: "bg-white/15 text-white ring-1 ring-white/20",
      subtitle: "Limited access",
    };
  }
  return {
    pill: display.statusLabel.toUpperCase(),
    pillClass: "bg-[#10b981] text-white shadow-[0_0_10px_rgba(16,185,129,0.35)]",
    subtitle: "Active subscription",
  };
}

export function SubscriptionDashboardCard({
  display,
}: {
  display: SubscriptionDisplay;
}) {
  const { planLabel, expiryDate, daysRemaining, graceDaysRemaining } = display;
  const status = getStatusConfig(display);
  const progressPercent = getProgressPercent(display);
  const remainingDays = display.showGraceBanner ? graceDaysRemaining : daysRemaining;
  const showActivePremium =
    display.isPremium && display.statusLabel === "Active" && expiryDate && remainingDays !== null;
  const showUpgrade =
    (display.isFree || display.showExpiredBanner || display.showGraceBanner) &&
    display.canSelfSubscribe;

  return (
    <Card
      className={cn(
        "group relative h-full overflow-hidden border-0 p-0",
        "shadow-[0_4px_24px_-4px_rgba(15,23,42,0.1),0_2px_8px_-2px_rgba(15,23,42,0.06)]",
        "ring-1 ring-slate-900/[0.04] transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-6px_rgba(15,23,42,0.14)] hover:ring-[#10b981]/25"
      )}
      style={{ background: "linear-gradient(145deg, #062a66 0%, #0b3d91 50%, #084a8a 100%)" }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="lecturer-subscription-glow absolute -right-4 -top-6 h-20 w-20 rounded-full bg-[#10b981]/20 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-16 w-24 rounded-full bg-[#1d6fd4]/15 blur-2xl" />
        <svg
          className="absolute inset-0 h-full w-full opacity-50"
          viewBox="0 0 320 140"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <path
            d="M-10 110 C 60 70, 120 120, 200 80 S 300 50, 340 70 L 340 150 L -10 150 Z"
            fill="url(#lecturer-sub-wave)"
          />
          <defs>
            <linearGradient id="lecturer-sub-wave" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0b3d91" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Mirrors StatCard: CardHeader pb-2 + CardContent pt-0 */}
      <div className="relative z-10 flex flex-row items-center justify-between space-y-0 px-6 pb-2 pt-6">
        <p className="text-sm font-bold text-[#10b981]">Subscription</p>
        <div className="flex items-center gap-1">
          {display.isPremium && (
            <span className="rounded px-1 py-0.5 text-[0.5rem] font-semibold uppercase tracking-wider text-white/70 ring-1 ring-white/15">
              Pro
            </span>
          )}
          <div className="flex h-4 w-4 items-center justify-center">
            {display.isPremium ? (
              <Crown className="h-4 w-4 text-[#10b981]" />
            ) : (
              <Shield className="h-4 w-4 text-white/80" />
            )}
          </div>
        </div>
      </div>

      <CardContent className="relative z-10 px-6 pb-6 pt-0">
        <div className="text-2xl font-bold text-white">{planLabel}</div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[0.55rem] font-bold tracking-wider",
              status.pillClass
            )}
          >
            {status.pill}
          </span>
          <span className="text-xs text-white/65">{status.subtitle}</span>
        </div>

        {showActivePremium && (
          <div className="mt-1 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs text-white/55">
                Expires {formatDate(expiryDate)}
              </p>
              <div className="flex shrink-0 items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums leading-none text-white">
                  {remainingDays}
                </span>
                <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[#10b981]">
                  days
                </span>
              </div>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#34d399]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {display.showGraceBanner && graceDaysRemaining !== null && !showActivePremium && (
          <p className="mt-1 text-xs text-amber-200">
            <span className="text-2xl font-bold tabular-nums text-white">{graceDaysRemaining}</span>
            {" "}days in grace period
          </p>
        )}

        {display.isFree && (
          <p className="mt-1 text-xs text-white/55">
            2 sessions · 50 students · 1 test · 1 assignment
          </p>
        )}

        {showUpgrade && (
          <Button
            variant="accent"
            size="sm"
            className="mt-2 h-7 w-full border-0 text-xs"
            asChild
          >
            <Link href="/lecturer/subscription">
              {display.isPremium ? "Renew Plan" : "Upgrade Plan"}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function SubscriptionStatusBanner({
  display,
}: {
  display: SubscriptionDisplay;
}) {
  if (display.showExpiryReminder && display.expiryReminderMessage) {
    return (
      <Card className="mb-6 border-amber-300 bg-amber-50">
        <CardContent className="py-4">
          <p className="text-sm text-amber-900">{display.expiryReminderMessage}</p>
        </CardContent>
      </Card>
    );
  }

  if (display.showGraceBanner) {
    return (
      <Card className="mb-6 border-amber-300 bg-amber-50">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-900">
            Your subscription has expired. You have {display.graceDaysRemaining} day
            {display.graceDaysRemaining === 1 ? "" : "s"} remaining in your grace period. Renew now
            to continue uninterrupted access.
          </p>
          <Button variant="accent" size="sm" asChild>
            <Link href="/lecturer/subscription">Renew Now</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (display.showExpiredBanner) {
    return (
      <Card className="mb-6 border-destructive/40 bg-red-50">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-destructive">
            Your subscription has expired. Renew your plan to continue using Lectrax.
          </p>
          <Button variant="destructive" size="sm" asChild>
            <Link href="/lecturer/subscription">Renew Plan</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
