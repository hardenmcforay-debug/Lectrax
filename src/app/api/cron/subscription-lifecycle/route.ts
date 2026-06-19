import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getCronSecret } from "@/lib/env";
import { logSystemAudit } from "@/lib/audit";
import {
  backfillMissingSubscriptionRecords,
  processExpiryReminders,
  refreshSubscriptionLifecycle,
} from "@/lib/subscription/lifecycle";

export async function POST(request: Request) {
  const secret = getCronSecret();
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await createServiceClient();

  const { data: premiumLecturers } = await service
    .from("profiles")
    .select("id")
    .eq("role", "lecturer")
    .eq("subscription_plan", "premium");

  let lifecycleUpdates = 0;
  let lifecycleFailures = 0;

  for (const lecturer of premiumLecturers ?? []) {
    try {
      const before = await service
        .from("profiles")
        .select("subscription_status")
        .eq("id", lecturer.id)
        .single();

      await refreshSubscriptionLifecycle(lecturer.id, service);

      const after = await service
        .from("profiles")
        .select("subscription_status")
        .eq("id", lecturer.id)
        .single();

      if (before.data?.subscription_status !== after.data?.subscription_status) {
        lifecycleUpdates += 1;
      }
    } catch (error) {
      lifecycleFailures += 1;
      console.error("subscription_lifecycle_lecturer_failed", lecturer.id, error);
    }
  }

  const remindersSent = await processExpiryReminders(service);
  const backfilledSubscriptions = await backfillMissingSubscriptionRecords(service);

  if (lifecycleFailures > 0) {
    void logSystemAudit({
      action: "subscription_lifecycle_partial_failure",
      entityType: "cron",
      metadata: {
        lifecycle_failures: lifecycleFailures,
        lifecycle_updates: lifecycleUpdates,
      },
    });
  }

  return NextResponse.json({
    ok: lifecycleFailures === 0,
    lifecycleUpdates,
    lifecycleFailures,
    remindersSent,
    backfilledSubscriptions,
    processedAt: new Date().toISOString(),
  });
}
