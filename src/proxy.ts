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

export async function proxy(request: NextRequest) {
  const nonce = createCspNonce();
  const cspMode = getCspMode();

  const requestHeaders = new Headers(request.headers);
  if (cspMode !== "off") {
    attachCspRequestHeaders(requestHeaders, nonce);
  }

  // Clone preserves body/cookies; overlay CSP nonce headers for RSC.
  const observedRequest = new NextRequest(request, { headers: requestHeaders });

  const abuseResponse = rejectIfAbusiveRequest(observedRequest);
  if (abuseResponse) {
    return applyCspHeaders(abuseResponse, nonce, cspMode);
  }

  const csrfResponse = rejectIfCsrfViolation(observedRequest);
  if (csrfResponse) {
    return applyCspHeaders(csrfResponse, nonce, cspMode);
  }

  const response = await updateSession(observedRequest);
  return applyCspHeaders(response, nonce, cspMode);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|robots.txt|icons/|splash/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html)$).*)",
  ],
};
