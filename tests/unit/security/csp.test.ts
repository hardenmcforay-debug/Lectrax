import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyCspHeaders,
  attachCspRequestHeaders,
  buildContentSecurityPolicy,
  buildReportingEndpointsHeader,
  createCspNonce,
  CSP_NONCE_HEADER,
  CSP_REPORT_PATH,
  getCspMode,
  getCspResponseHeaderName,
} from "@/lib/security/csp";
import { NextResponse } from "next/server";

describe("csp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates unique base64 nonces", () => {
    const a = createCspNonce();
    const b = createCspNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(a).not.toBe(b);
    expect(Buffer.from(a, "base64").byteLength).toBe(16);
  });

  it("builds a nonce + strict-dynamic script policy without script unsafe-inline", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");

    const policy = buildContentSecurityPolicy("test-nonce-value");

    expect(policy).toContain("script-src 'self' 'nonce-test-nonce-value' 'strict-dynamic'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).toContain("https://abc.supabase.co");
    expect(policy).toContain("wss://abc.supabase.co");
    expect(policy).toContain("https://*.ingest.sentry.io");
    expect(policy).toContain(`report-uri ${CSP_REPORT_PATH}`);
    expect(policy).toContain("report-to csp-endpoint");
    expect(policy).toContain("upgrade-insecure-requests");
    // Server-only providers must not appear in browser CSP.
    expect(policy).not.toContain("monime");
    expect(policy).not.toContain("resend");
    expect(policy).not.toContain("fonts.googleapis.com");
  });

  it("allows unsafe-eval only in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const policy = buildContentSecurityPolicy("n");
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });

  it("defaults CSP mode to report-only", () => {
    vi.stubEnv("CSP_MODE", "");
    expect(getCspMode()).toBe("report-only");
    expect(getCspResponseHeaderName()).toBe(
      "Content-Security-Policy-Report-Only"
    );
  });

  it("supports enforce and off modes", () => {
    vi.stubEnv("CSP_MODE", "enforce");
    expect(getCspMode()).toBe("enforce");
    expect(getCspResponseHeaderName()).toBe("Content-Security-Policy");

    vi.stubEnv("CSP_MODE", "off");
    expect(getCspMode()).toBe("off");
    expect(getCspResponseHeaderName()).toBeNull();
  });

  it("applies report-only headers by default", () => {
    vi.stubEnv("CSP_MODE", "report-only");
    const response = NextResponse.next();
    applyCspHeaders(response, "abc123");

    expect(response.headers.get("Content-Security-Policy-Report-Only")).toContain(
      "'nonce-abc123'"
    );
    expect(response.headers.get("Content-Security-Policy")).toBeNull();
    expect(response.headers.get("Reporting-Endpoints")).toBe(
      buildReportingEndpointsHeader()
    );
  });

  it("attaches nonce request headers for Next.js", () => {
    const headers = new Headers();
    attachCspRequestHeaders(headers, "xyz");
    expect(headers.get(CSP_NONCE_HEADER)).toBe("xyz");
    expect(headers.get("Content-Security-Policy")).toContain("'nonce-xyz'");
  });
});
