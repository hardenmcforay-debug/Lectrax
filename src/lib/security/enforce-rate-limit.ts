import { NextResponse } from "next/server";
import {
  buildDeviceRateLimitKey,
  buildRateLimitHeaders,
  buildUserRateLimitKey,
  checkRateLimit,
  logRateLimitViolation,
  type RateLimitResult,
  type RateLimitRule,
} from "@/lib/security/rate-limit";
import {
  RATE_LIMIT_POLICIES,
  type RateLimitPolicyName,
} from "@/lib/security/rate-limit-policies";

function resolveRule(policy: RateLimitPolicyName | RateLimitRule): RateLimitRule {
  return typeof policy === "string" ? RATE_LIMIT_POLICIES[policy] : policy;
}

function tooManyRequestsResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: buildRateLimitHeaders(result),
    }
  );
}

/** Apply a named policy to an arbitrary key (identifier, IP, composite, …). */
export async function rejectIfKeyRateLimited(
  key: string,
  policy: RateLimitPolicyName | RateLimitRule,
  logScope?: string
): Promise<NextResponse | null> {
  const rule = resolveRule(policy);
  const result = await checkRateLimit(key, rule);

  if (result.allowed) return null;

  if (logScope) {
    logRateLimitViolation(logScope, key.split(":")[0] ?? "unknown");
  }

  return tooManyRequestsResponse(result);
}

/** Per-user limit after authentication (complements middleware IP limits). */
export async function rejectIfUserRateLimited(
  userId: string,
  policy: RateLimitPolicyName,
  logScope?: string
): Promise<NextResponse | null> {
  return rejectIfKeyRateLimited(
    buildUserRateLimitKey(userId, policy),
    policy,
    logScope
  );
}

/**
 * Per-device limit (attendance device UUID / fingerprint id).
 * Complements IP + user buckets for QR scan / verification abuse.
 */
export async function rejectIfDeviceRateLimited(
  deviceId: string,
  policy: RateLimitPolicyName,
  logScope?: string
): Promise<NextResponse | null> {
  const normalized = deviceId.trim();
  if (!normalized) return null;

  return rejectIfKeyRateLimited(
    buildDeviceRateLimitKey(normalized, policy),
    policy,
    logScope
  );
}
