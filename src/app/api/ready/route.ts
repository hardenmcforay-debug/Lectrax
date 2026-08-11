import { NextResponse } from "next/server";
import {
  buildReadyReport,
  healthHttpStatus,
} from "@/lib/observability/health";
import { BUSINESS_EVENTS, trackBusinessEvent } from "@/lib/observability/business-events";
import { resolveRequestId } from "@/lib/observability/request-id";
import { withApiObservability } from "@/lib/observability/with-api-observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handler(request: Request) {
  const requestId = resolveRequestId(request);
  const report = await buildReadyReport();

  if (report.status === "fail") {
    trackBusinessEvent(
      BUSINESS_EVENTS.HEALTH_DEGRADED,
      {
        mode: "ready",
        status: report.status,
        failed: report.probes.filter((p) => p.status === "fail").map((p) => p.name),
        totalLatencyMs: report.totalLatencyMs,
        requestId,
      },
      { severity: "error" }
    );
  }

  const response = NextResponse.json(report, {
    status: healthHttpStatus(report.status, "ready"),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const GET = withApiObservability("ready.get", handler);
