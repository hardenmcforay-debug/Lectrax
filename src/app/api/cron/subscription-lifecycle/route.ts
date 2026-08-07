import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getCronSecret } from "@/lib/env";
import { logSystemAudit } from "@/lib/audit";
import {
  backfillMissingSubscriptionRecords,
  processExpiryReminders,
  refreshAllPremiumSubscriptionLifecycles,
} from "@/lib/subscription/lifecycle";
import { BUSINESS_EVENTS, trackBusinessEvent } from "@/lib/observability/business-events";
import { withApiObservability } from "@/lib/observability/with-api-observability";

async function postHandler(request: Request) {
  const secret = getCronSecret();
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await createServiceClient();

  const lifecycle = await refreshAllPremiumSubscriptionLifecycles(service);
  const remindersSent = await processExpiryReminders(service);
  const backfilledSubscriptions = await backfillMissingSubscriptionRecords(service);

  const summary = {
    lifecycleUpdates: lifecycle.lifecycleUpdates,
    lifecycleFailures: lifecycle.lifecycleFailures,
    processedLecturers: lifecycle.processedLecturers,
    pagesProcessed: lifecycle.pagesProcessed,
    remindersSent,
    backfilledSubscriptions,
    processedAt: new Date().toISOString(),
  };

  if (lifecycle.lifecycleFailures > 0) {
    void logSystemAudit({
      action: "subscription_lifecycle_partial_failure",
      entityType: "cron",
      metadata: {
        lifecycle_failures: lifecycle.lifecycleFailures,
        lifecycle_updates: lifecycle.lifecycleUpdates,
        processed_lecturers: lifecycle.processedLecturers,
        pages_processed: lifecycle.pagesProcessed,
      },
    });
    trackBusinessEvent(BUSINESS_EVENTS.CRON_FAILURE, summary, { severity: "error" });
  } else {
    trackBusinessEvent(BUSINESS_EVENTS.CRON_SUCCESS, summary);
  }

  return NextResponse.json({
    ok: lifecycle.lifecycleFailures === 0,
    ...summary,
  });
}

export const POST = withApiObservability("cron.subscription-lifecycle.post", postHandler);
