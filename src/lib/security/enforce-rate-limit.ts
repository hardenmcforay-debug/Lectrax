import { NextResponse } from "next/server";
import {
  checkRateLimit,
  logRateLimitViolation,
  type RateLimitRule,
} from "@/lib/security/rate-limit";
import {
  RATE_LIMIT_POLICIES,
  type RateLimitPolicyName,
} from "@/lib/security/rate-limit-policies";

function tooManyRequestsResponse(retryAfterSec?: number): NextResponse {
  const headers: Record<string, string> = {};
  if (retryAfterSec) {
    headers["Retry-After"] = String(retryAfterSec);
  }

  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers }
  );
}

/** Apply a named policy to an arbitrary key (e.g. authenticated user id). */
export function rejectIfKeyRateLimited(
  key: string,
  policy: RateLimitPolicyName | RateLimitRule,
  logScope?: string
): NextResponse | null {
  const rule =
    typeof policy === "string" ? RATE_LIMIT_POLICIES[policy] : policy;
  const result = checkRateLimit(key, rule);

  if (result.allowed) return null;

  if (logScope) {
    logRateLimitViolation(logScope, key.split(":")[0] ?? "unknown");
  }

  return tooManyRequestsResponse(result.retryAfterSec);
}

/** Per-user limit after authentication (complements middleware IP limits). */
export function rejectIfUserRateLimited(
  userId: string,
  policy: RateLimitPolicyName,
  logScope?: string
): NextResponse | null {
  return rejectIfKeyRateLimited(`user:${userId}:${policy}`, policy, logScope);
}
