import { NextResponse, type NextRequest } from "next/server";

/** Custom header — cross-origin pages cannot set this on forged requests. */
export const CSRF_HEADER_NAME = "X-Lectrax-Request";
export const CSRF_HEADER_VALUE = "1";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const CSRF_EXEMPT_PREFIXES = ["/api/webhooks/", "/api/cron/"] as const;

export function isMutationMethod(method: string): boolean {
  return MUTATION_METHODS.has(method.toUpperCase());
}

export function isCsrfExemptPath(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isSameOriginAppApiUrl(url: string): boolean {
  if (url.startsWith("/api/")) return true;
  try {
    const parsed = new URL(url, "http://localhost");
    return parsed.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

/** Headers attached to same-origin mutating API requests from the browser. */
export function getCsrfRequestHeaders(): Record<string, string> {
  return { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE };
}

function hostsMatch(request: NextRequest): boolean {
  const host = request.headers.get("host");
  if (!host) return false;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Validate that a mutating /api request is not a cross-site forgery.
 * Uses Sec-Fetch-Site, Origin/Referer, and the custom CSRF header.
 */
export function isAllowedApiMutation(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) return true;
  if (!isMutationMethod(request.method)) return true;
  if (isCsrfExemptPath(pathname)) return true;

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") return false;

  if (request.headers.get(CSRF_HEADER_NAME) === CSRF_HEADER_VALUE) {
    return true;
  }

  if (hostsMatch(request)) {
    return secFetchSite === "same-origin" || secFetchSite === "same-site" || !secFetchSite;
  }

  return process.env.NODE_ENV !== "production";
}

/** Returns a 403 response when a mutation fails CSRF checks, otherwise null. */
export function rejectIfCsrfViolation(request: NextRequest): NextResponse | null {
  if (isAllowedApiMutation(request)) return null;

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
