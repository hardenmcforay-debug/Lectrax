import { NextResponse } from "next/server";
import {
  buildLiveReport,
  healthHttpStatus,
} from "@/lib/observability/health";
import { withApiObservability } from "@/lib/observability/with-api-observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handler() {
  const report = buildLiveReport();
  const response = NextResponse.json(report, {
    status: healthHttpStatus(report.status, "live"),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const GET = withApiObservability("live.get", handler);
