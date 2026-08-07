/**
 * Request-scoped Content-Security-Policy for Lectrax.
 *
 * Script policy uses per-request nonces + 'strict-dynamic' (no script 'unsafe-inline').
 * Styles keep 'unsafe-inline' for Tailwind / React inline styles.
 *
 * Mode (CSP_MODE):
 * - report-only (default) — Content-Security-Policy-Report-Only (does not block)
 * - enforce — Content-Security-Policy
 * - off — no CSP headers (emergency only)
 *
 * Browser CSP only covers browser-loaded resources. Monime / Resend stay server-side
 * and must not be added to connect-src. next/font self-hosts Google Fonts → font-src 'self'.
 */

import { NextResponse } from "next/server";

export const CSP_NONCE_HEADER = "x-nonce";
export const CSP_REPORTING_ENDPOINT_NAME = "csp-endpoint";
export const CSP_REPORT_PATH = "/api/csp-report";

export type CspMode = "report-only" | "enforce" | "off";

export function getCspMode(): CspMode {
  const raw = process.env.CSP_MODE?.trim().toLowerCase();
  if (raw === "enforce" || raw === "enforcing") return "enforce";
  if (raw === "off" || raw === "disabled") return "off";
  return "report-only";
}

/** Cryptographically strong, base64 nonce (≥128 bits of entropy). */
export function createCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function getSupabaseCspHosts(): { https: string; wss: string } {
  const fallback = { https: "https://*.supabase.co", wss: "wss://*.supabase.co" };
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!configured) return fallback;

  try {
    const host = new URL(configured).host;
    return { https: `https://${host}`, wss: `wss://${host}` };
  } catch {
    return fallback;
  }
}

/**
 * Build the CSP policy string for a request nonce.
 * Dev keeps 'unsafe-eval' for Next.js HMR only — never in production.
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const isDev = !isProduction();
  const supabase = getSupabaseCspHosts();

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // Temporary: Tailwind / React style props / critical boot CSS.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://*.supabase.co ${supabase.https}`,
    "font-src 'self'",
    `connect-src 'self' ${supabase.https} ${supabase.wss} https://*.ingest.sentry.io https://*.ingest.us.sentry.io`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'self' blob:",
    "frame-ancestors 'none'",
    `report-uri ${CSP_REPORT_PATH}`,
    `report-to ${CSP_REPORTING_ENDPOINT_NAME}`,
  ];

  if (isProduction()) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

/** Reporting-Endpoints header value for the CSP report collector. */
export function buildReportingEndpointsHeader(): string {
  return `${CSP_REPORTING_ENDPOINT_NAME}="${CSP_REPORT_PATH}"`;
}

export function getCspResponseHeaderName(mode: CspMode = getCspMode()): string | null {
  if (mode === "off") return null;
  if (mode === "enforce") return "Content-Security-Policy";
  return "Content-Security-Policy-Report-Only";
}

/**
 * Attach CSP (+ Reporting-Endpoints) to a middleware/proxy response.
 * Call after the response is created so redirects / JSON early-exits are covered.
 */
export function applyCspHeaders(
  response: NextResponse,
  nonce: string,
  mode: CspMode = getCspMode()
): NextResponse {
  const headerName = getCspResponseHeaderName(mode);
  if (!headerName) return response;

  const policy = buildContentSecurityPolicy(nonce);
  response.headers.set(headerName, policy);
  response.headers.set("Reporting-Endpoints", buildReportingEndpointsHeader());
  return response;
}

/**
 * Forward nonce (+ CSP string for Next.js script instrumentation) on the
 * inbound request so App Router can read `headers().get('x-nonce')` and
 * stamp framework scripts.
 */
export function attachCspRequestHeaders(
  requestHeaders: Headers,
  nonce: string
): void {
  const policy = buildContentSecurityPolicy(nonce);
  requestHeaders.set(CSP_NONCE_HEADER, nonce);
  // Next extracts the nonce from this request header during render.
  requestHeaders.set("Content-Security-Policy", policy);
}
