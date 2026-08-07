/**
 * CSP violation collector for Report-Only and enforcing modes.
 * Browsers POST here without Lectrax CSRF headers — path is CSRF-exempt.
 */

import { NextResponse } from "next/server";
import { resolveRequestId } from "@/lib/observability/request-id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_REPORT_BYTES = 8_192;

type CspReportBody = {
  "csp-report"?: Record<string, unknown>;
  type?: string;
  age?: number;
  url?: string;
  user_agent?: string;
  body?: Record<string, unknown>;
};

function truncate(value: unknown, max = 512): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function normalizeReport(payload: unknown): Record<string, string | undefined> {
  if (!payload || typeof payload !== "object") {
    return { documentUri: undefined, effectiveDirective: undefined, blockedUri: undefined };
  }

  const root = payload as CspReportBody;
  const legacy = root["csp-report"];
  const modern = root.body;
  const report =
    (legacy && typeof legacy === "object" ? legacy : null) ??
    (modern && typeof modern === "object" ? modern : null) ??
    (payload as Record<string, unknown>);

  return {
    documentUri: truncate(
      report["document-uri"] ?? report.documentURL ?? report.documentUri ?? root.url
    ),
    effectiveDirective: truncate(
      report["effective-directive"] ??
        report.effectiveDirective ??
        report.disposition
    ),
    violatedDirective: truncate(
      report["violated-directive"] ?? report.violatedDirective
    ),
    blockedUri: truncate(report["blocked-uri"] ?? report.blockedURL ?? report.blockedUri),
    sourceFile: truncate(report["source-file"] ?? report.sourceFile),
    lineNumber: truncate(
      report["line-number"] != null
        ? String(report["line-number"])
        : report.lineNumber != null
          ? String(report.lineNumber)
          : undefined
    ),
    statusCode: truncate(
      report["status-code"] != null
        ? String(report["status-code"])
        : report.statusCode != null
          ? String(report.statusCode)
          : undefined
    ),
    sample: truncate(report.sample ?? report.scriptSample, 200),
  };
}

export async function POST(request: Request) {
  const requestId = resolveRequestId(request);
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  if (raw.length > MAX_REPORT_BYTES) {
    console.warn(
      `[csp-report] oversized body bytes=${raw.length} requestId=${requestId} ip=${ip}`
    );
    return new NextResponse(null, { status: 204 });
  }

  let parsed: unknown = null;
  if (raw.trim()) {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      console.warn(
        `[csp-report] invalid json requestId=${requestId} ip=${ip} bytes=${raw.length}`
      );
      return new NextResponse(null, { status: 204 });
    }
  }

  const reports = Array.isArray(parsed) ? parsed : [parsed];
  for (const entry of reports) {
    const fields = normalizeReport(entry);
    console.info(
      [
        "[csp-report]",
        `requestId=${requestId}`,
        `ip=${ip}`,
        `documentUri=${fields.documentUri ?? "-"}`,
        `effectiveDirective=${fields.effectiveDirective ?? fields.violatedDirective ?? "-"}`,
        `blockedUri=${fields.blockedUri ?? "-"}`,
        `sourceFile=${fields.sourceFile ?? "-"}`,
        `line=${fields.lineNumber ?? "-"}`,
        `status=${fields.statusCode ?? "-"}`,
        fields.sample ? `sample=${fields.sample}` : null,
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  // 204 — browsers ignore the body; avoid triggering follow-up fetches.
  return new NextResponse(null, { status: 204 });
}
