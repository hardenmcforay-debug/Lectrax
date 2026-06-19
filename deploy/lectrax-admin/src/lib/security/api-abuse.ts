import { NextResponse, type NextRequest } from "next/server";
import { isCsrfExemptPath, isMutationMethod } from "@/lib/security/csrf";
import { isBodyTooLarge } from "@/lib/security/request-limits";
import {
  buildRateLimitKey,
  checkRateLimit,
  type RateLimitRule,
} from "@/lib/security/rate-limit";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

function isPaymentStatusPath(pathname: string): boolean {
  return /^\/api\/payments\/[^/]+\/status$/.test(pathname);
}

function isExportPath(pathname: string): boolean {
  return pathname.includes("/export");
}

function resolveRateLimitRule(pathname: string, method: string): RateLimitRule | null {
  if (!pathname.startsWith("/api/")) return null;
  if (isCsrfExemptPath(pathname)) return null;

  const upperMethod = method.toUpperCase();

  if (pathname === "/api/contact" && upperMethod === "POST") {
    return { limit: 5, windowMs: 15 * 60_000 };
  }

  if (pathname === "/api/partnerships/inquiry" && upperMethod === "POST") {
    return { limit: 5, windowMs: 15 * 60_000 };
  }

  if (pathname === "/api/attendance/scan" && upperMethod === "POST") {
    return { limit: 40, windowMs: 60_000 };
  }

  if (pathname === "/api/student/join" && upperMethod === "POST") {
    return { limit: 10, windowMs: 15 * 60_000 };
  }

  if (pathname === "/api/payments/checkout" && upperMethod === "POST") {
    return { limit: 8, windowMs: 15 * 60_000 };
  }

  if (isPaymentStatusPath(pathname) && upperMethod === "GET") {
    return { limit: 60, windowMs: 60_000 };
  }

  if (isExportPath(pathname) && isMutationMethod(method)) {
    return { limit: 10, windowMs: 60 * 60_000 };
  }

  if (pathname.startsWith("/api/admin/") && isMutationMethod(method)) {
    return { limit: 40, windowMs: 60_000 };
  }

  if (pathname.startsWith("/api/attendance/") && isMutationMethod(method)) {
    return { limit: 60, windowMs: 60_000 };
  }

  if (pathname.startsWith("/api/student/assignments/") && upperMethod === "POST") {
    return { limit: 15, windowMs: 15 * 60_000 };
  }

  if (pathname.startsWith("/api/") && isMutationMethod(method)) {
    return { limit: 100, windowMs: 60_000 };
  }

  if (pathname.startsWith("/api/") && upperMethod === "GET") {
    return { limit: 200, windowMs: 60_000 };
  }

  return null;
}

function rateLimitScope(pathname: string, method: string): string {
  if (pathname === "/api/contact") return "contact";
  if (pathname === "/api/partnerships/inquiry") return "partnership";
  if (pathname === "/api/attendance/scan") return "attendance-scan";
  if (pathname === "/api/student/join") return "student-join";
  if (pathname === "/api/payments/checkout") return "payments-checkout";
  if (isPaymentStatusPath(pathname)) return "payments-status";
  if (isExportPath(pathname)) return "export";
  if (pathname.startsWith("/api/admin/")) return "admin-mutation";
  if (pathname.startsWith("/api/attendance/")) return "attendance-mutation";
  if (pathname.startsWith("/api/student/assignments/") && method.toUpperCase() === "POST") {
    return "assignment-submit";
  }
  if (pathname.startsWith("/api/") && isMutationMethod(method)) return "api-mutation";
  if (pathname.startsWith("/api/")) return "api-read";
  return "page";
}

/** Fast reject for oversized request bodies (uses Content-Length when present). */
export function rejectIfBodyTooLarge(request: NextRequest): NextResponse | null {
  if (!isMutationMethod(request.method)) return null;
  if (!request.nextUrl.pathname.startsWith("/api/")) return null;
  if (!isBodyTooLarge(request)) return null;

  return NextResponse.json(
    { error: "Request body is too large." },
    { status: 413 }
  );
}

/** Returns 429 when the client exceeds configured API rate limits. */
export function rejectIfRateLimited(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const rule = resolveRateLimitRule(pathname, request.method);
  if (!rule) return null;

  const ip = getClientIp(request);
  const scope = rateLimitScope(pathname, request.method);
  const result = checkRateLimit(buildRateLimitKey(ip, scope), rule);

  if (result.allowed) return null;

  const headers: Record<string, string> = {};
  if (result.retryAfterSec) {
    headers["Retry-After"] = String(result.retryAfterSec);
  }

  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers }
  );
}

/** Combined early abuse checks for middleware (body size + rate limits). */
export function rejectIfAbusiveRequest(request: NextRequest): NextResponse | null {
  return rejectIfBodyTooLarge(request) ?? rejectIfRateLimited(request);
}
