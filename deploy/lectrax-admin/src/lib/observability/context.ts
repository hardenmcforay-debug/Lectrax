import { headers } from "next/headers";
import type { ApiRequestOutcome } from "@/lib/observability/constants";
import { TENANT_HEADER } from "@/lib/observability/constants";
import { getRequestIdFromHeaders } from "@/lib/observability/request-id";
import { readTenantFromRequest } from "@/lib/observability/request-store";

export type RequestLogContext = {
  requestId?: string | null;
  userId?: string | null;
  /** Future multi-tenant campus/org id. */
  tenant?: string | null;
  route?: string | null;
  method?: string | null;
  /** HTTP status (alias preferred in access logs). */
  status?: number | null;
  statusCode?: number | null;
  durationMs?: number | null;
  duration?: number | null;
  outcome?: ApiRequestOutcome | null;
  ip?: string | null;
  userAgent?: string | null;
  device?: string | null;
};

function truncate(value: string, max = 240): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || null;
}

export function getDeviceInfo(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("chrome/")) return "chrome";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "safari";
  if (ua.includes("firefox/")) return "firefox";
  if (ua.includes("iphone") || ua.includes("ipad")) return "ios";
  if (ua.includes("android")) return "android";
  return "other";
}

export function buildRequestContext(
  request: Request,
  extras: Partial<RequestLogContext> = {}
): RequestLogContext {
  const userAgent = request.headers.get("user-agent");
  return {
    requestId: getRequestIdFromHeaders(request.headers),
    route: new URL(request.url).pathname,
    method: request.method,
    tenant: readTenantFromRequest(request),
    ip: getClientIp(request),
    userAgent: userAgent ? truncate(userAgent) : null,
    device: getDeviceInfo(userAgent),
    ...extras,
  };
}

/** Best-effort context from Next.js request headers store (Route Handlers / Server Components). */
export async function readServerRequestContext(): Promise<RequestLogContext> {
  try {
    const h = await headers();
    const userAgent = h.get("user-agent");
    return {
      requestId: getRequestIdFromHeaders(h),
      tenant: h.get(TENANT_HEADER)?.trim() || null,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
      userAgent: userAgent ? truncate(userAgent) : null,
      device: getDeviceInfo(userAgent),
    };
  } catch {
    return {};
  }
}
