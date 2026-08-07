import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { rejectIfAbusiveRequest } from "@/lib/security/api-abuse";
import { rejectIfCsrfViolation } from "@/lib/security/csrf";
import {
  applyCspHeaders,
  attachCspRequestHeaders,
  createCspNonce,
  getCspMode,
} from "@/lib/security/csp";
import {
  REQUEST_ID_HEADER,
  REQUEST_ID_RESPONSE_HEADER,
} from "@/lib/observability/constants";
import { resolveRequestId } from "@/lib/observability/request-id";

export async function proxy(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const nonce = createCspNonce();
  const cspMode = getCspMode();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  if (cspMode !== "off") {
    attachCspRequestHeaders(requestHeaders, nonce);
  }

  // Clone preserves body/cookies; overlay request-id + CSP nonce headers for RSC.
  const observedRequest = new NextRequest(request, { headers: requestHeaders });

  const abuseResponse = await rejectIfAbusiveRequest(observedRequest);
  if (abuseResponse) {
    abuseResponse.headers.set(REQUEST_ID_RESPONSE_HEADER, requestId);
    return applyCspHeaders(abuseResponse, nonce, cspMode);
  }

  const csrfResponse = rejectIfCsrfViolation(observedRequest);
  if (csrfResponse) {
    csrfResponse.headers.set(REQUEST_ID_RESPONSE_HEADER, requestId);
    return applyCspHeaders(csrfResponse, nonce, cspMode);
  }

  const response = await updateSession(observedRequest);
  response.headers.set(REQUEST_ID_RESPONSE_HEADER, requestId);
  return applyCspHeaders(response, nonce, cspMode);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|robots.txt|icons/|splash/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html)$).*)",
  ],
};
