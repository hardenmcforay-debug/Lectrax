import { NextResponse } from "next/server";
import {
  buildHealthReport,
  healthHttpStatus,
} from "@/lib/observability/health";
import { BUSINESS_EVENTS, trackBusinessEvent } from "@/lib/observability/business-events";
import { resolveRequestId } from "@/lib/observability/request-id";
import { withApiObservability } from "@/lib/observability/with-api-observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handler(request: Request) {
  const requestId = resolveRequestId(request);
  const report = await buildHealthReport();

  if (report.status === "fail" || report.status === "warn") {
    trackBusinessEvent(
      BUSINESS_EVENTS.HEALTH_DEGRADED,
      {
        mode: "health",
        status: report.status,
        failed: report.probes.filter((p) => p.status !== "pass").map((p) => p.name),
        totalLatencyMs: report.totalLatencyMs,
        requestId,
      },
      { severity: report.status === "fail" ? "error" : "warning" }
    );
  }

  const response = NextResponse.json(report, {
    status: healthHttpStatus(report.status, "health"),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const GET = withApiObservability("health.get", handler);
