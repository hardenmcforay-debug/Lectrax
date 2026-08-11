import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  CSRF_HEADER_NAME,
  CSRF_HEADER_VALUE,
  isAllowedApiMutation,
  rejectIfCsrfViolation,
} from "@/lib/security/csrf";

function mutationRequest(
  path: string,
  init?: {
    method?: string;
    origin?: string;
    secFetchSite?: string;
    csrf?: boolean;
  }
): NextRequest {
  const headers = new Headers({
    "content-type": "application/json",
  });
  if (init?.origin) headers.set("origin", init.origin);
  if (init?.secFetchSite) headers.set("sec-fetch-site", init.secFetchSite);
  if (init?.csrf) headers.set(CSRF_HEADER_NAME, CSRF_HEADER_VALUE);

  return new NextRequest(`https://lectrax.vercel.app${path}`, {
    method: init?.method ?? "POST",
    headers,
  });
}

describe("csrf", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows GET requests without CSRF checks", () => {
    const request = mutationRequest("/api/profile", {
      method: "GET",
      origin: "https://evil.example",
      secFetchSite: "cross-site",
    });
    expect(isAllowedApiMutation(request)).toBe(true);
    expect(rejectIfCsrfViolation(request)).toBeNull();
  });

  it("rejects cross-site mutations in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = mutationRequest("/api/contact", {
      origin: "https://evil.example",
      secFetchSite: "cross-site",
    });
    expect(isAllowedApiMutation(request)).toBe(false);
    const response = rejectIfCsrfViolation(request);
    expect(response?.status).toBe(403);
  });

  it("allows same-origin mutations with the CSRF header", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = mutationRequest("/api/contact", {
      origin: "https://lectrax.vercel.app",
      secFetchSite: "same-origin",
      csrf: true,
    });
    expect(isAllowedApiMutation(request)).toBe(true);
    expect(rejectIfCsrfViolation(request)).toBeNull();
  });

  it("allows webhook and cron paths without the CSRF header", () => {
    vi.stubEnv("NODE_ENV", "production");
    const webhook = mutationRequest("/api/webhooks/monime", {
      origin: "https://evil.example",
      secFetchSite: "cross-site",
    });
    const cron = mutationRequest("/api/cron/subscription-lifecycle", {
      origin: "https://evil.example",
      secFetchSite: "cross-site",
    });
    expect(isAllowedApiMutation(webhook)).toBe(true);
    expect(isAllowedApiMutation(cron)).toBe(true);
  });

  it("requires method preservation when rebuilding NextRequest for proxy checks", () => {
    vi.stubEnv("NODE_ENV", "production");
    const original = mutationRequest("/api/contact", {
      origin: "https://evil.example",
      secFetchSite: "cross-site",
    });

    const droppedMethod = new NextRequest(original.nextUrl, {
      headers: original.headers,
    });
    expect(droppedMethod.method).toBe("GET");
    expect(isAllowedApiMutation(droppedMethod)).toBe(true);

    const preserved = new NextRequest(original.nextUrl, {
      method: original.method,
      headers: original.headers,
    });
    expect(preserved.method).toBe("POST");
    expect(isAllowedApiMutation(preserved)).toBe(false);
  });
});
