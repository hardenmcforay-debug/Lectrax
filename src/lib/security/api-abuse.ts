import { NextResponse, type NextRequest } from "next/server";
import { isCsrfExemptPath, isMutationMethod } from "@/lib/security/csrf";
import { isBodyTooLarge } from "@/lib/security/request-limits";
import {
  buildRateLimitKey,
  checkRateLimit,
  logRateLimitViolation,
  type RateLimitRule,
} from "@/lib/security/rate-limit";
import {
  RATE_LIMIT_POLICIES,
  type RateLimitPolicyName,
} from "@/lib/security/rate-limit-policies";

export function getClientIp(request: NextRequest): string {
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

function isGradesPath(pathname: string): boolean {
  return /\/assignments\/[^/]+\/grades$/.test(pathname);
}

function isScoresPath(pathname: string): boolean {
  return /\/tests\/[^/]+\/scores$/.test(pathname);
}

function isStudentRowsPath(pathname: string): boolean {
  return /\/student-rows$/.test(pathname);
}

function isBrandingUploadPath(pathname: string): boolean {
  return pathname === "/api/admin/site-logo" || pathname === "/api/admin/landing-hero";
}

type ResolvedLimit = {
  policy: RateLimitPolicyName;
  rule: RateLimitRule;
};

function resolveRateLimit(pathname: string, method: string): ResolvedLimit | null {
  const upperMethod = method.toUpperCase();

  if (pathname === "/auth/callback" && upperMethod === "GET") {
    return { policy: "authCallback", rule: RATE_LIMIT_POLICIES.authCallback };
  }

  if (!pathname.startsWith("/api/")) return null;
  if (isCsrfExemptPath(pathname)) return null;

  if (pathname === "/api/contact" && upperMethod === "POST") {
    return { policy: "contactForm", rule: RATE_LIMIT_POLICIES.contactForm };
  }

  if (pathname === "/api/partnerships/inquiry" && upperMethod === "POST") {
    return { policy: "partnershipInquiry", rule: RATE_LIMIT_POLICIES.partnershipInquiry };
  }

  if (pathname === "/api/attendance/scan" && upperMethod === "POST") {
    return { policy: "attendanceScan", rule: RATE_LIMIT_POLICIES.attendanceScan };
  }

  if (
    (pathname === "/api/attendance/device/register" ||
      pathname === "/api/attendance/device/transfer") &&
    upperMethod === "POST"
  ) {
    return { policy: "deviceRegister", rule: RATE_LIMIT_POLICIES.deviceRegister };
  }

  if (pathname === "/api/student/join" && upperMethod === "POST") {
    return { policy: "studentJoin", rule: RATE_LIMIT_POLICIES.studentJoin };
  }

  if (pathname === "/api/payments/checkout" && upperMethod === "POST") {
    return { policy: "paymentCheckout", rule: RATE_LIMIT_POLICIES.paymentCheckout };
  }

  if (isPaymentStatusPath(pathname) && upperMethod === "GET") {
    return { policy: "paymentStatusPoll", rule: RATE_LIMIT_POLICIES.paymentStatusPoll };
  }

  if (isExportPath(pathname) && isMutationMethod(method)) {
    return { policy: "dataExport", rule: RATE_LIMIT_POLICIES.dataExport };
  }

  if (isBrandingUploadPath(pathname) && isMutationMethod(method)) {
    return { policy: "brandingUpload", rule: RATE_LIMIT_POLICIES.brandingUpload };
  }

  if (isGradesPath(pathname) && isMutationMethod(method)) {
    return { policy: "gradeUpdate", rule: RATE_LIMIT_POLICIES.gradeUpdate };
  }

  if (isScoresPath(pathname) && isMutationMethod(method)) {
    return { policy: "scoreUpdate", rule: RATE_LIMIT_POLICIES.scoreUpdate };
  }

  if (isStudentRowsPath(pathname) && upperMethod === "GET") {
    return { policy: "studentRows", rule: RATE_LIMIT_POLICIES.studentRows };
  }

  if (pathname === "/api/student/notifications/counts" && upperMethod === "GET") {
    return { policy: "notificationPoll", rule: RATE_LIMIT_POLICIES.notificationPoll };
  }

  if (pathname.startsWith("/api/admin/") && isMutationMethod(method)) {
    return { policy: "adminMutation", rule: RATE_LIMIT_POLICIES.adminMutation };
  }

  if (pathname.startsWith("/api/attendance/") && isMutationMethod(method)) {
    return { policy: "attendanceMutation", rule: RATE_LIMIT_POLICIES.attendanceMutation };
  }

  if (pathname.startsWith("/api/student/assignments/") && upperMethod === "POST") {
    return { policy: "assignmentSubmit", rule: RATE_LIMIT_POLICIES.assignmentSubmit };
  }

  if (pathname.startsWith("/api/") && isMutationMethod(method)) {
    return { policy: "apiMutation", rule: RATE_LIMIT_POLICIES.apiMutation };
  }

  if (pathname.startsWith("/api/") && upperMethod === "GET") {
    return { policy: "apiRead", rule: RATE_LIMIT_POLICIES.apiRead };
  }

  return null;
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

/** Returns 429 when the client exceeds configured rate limits. */
export function rejectIfRateLimited(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const resolved = resolveRateLimit(pathname, request.method);
  if (!resolved) return null;

  const ip = getClientIp(request);
  const key = buildRateLimitKey(ip, resolved.policy);
  const result = checkRateLimit(key, resolved.rule);

  if (result.allowed) return null;

  logRateLimitViolation(resolved.policy, ip);

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
