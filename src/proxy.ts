import { NextRequest, NextResponse } from "next/server";
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
  isMarketingPath,
  isPwaScopePath,
  stripPwaScopePrefix,
} from "@/lib/pwa/scope";

export async function proxy(request: NextRequest) {
  const nonce = createCspNonce();
  const cspMode = getCspMode();

  const requestHeaders = new Headers(request.headers);
  if (cspMode !== "off") {
    attachCspRequestHeaders(requestHeaders, nonce);
  }

  const originalPath = request.nextUrl.pathname;
  const pwaScoped = isPwaScopePath(originalPath);
  if (pwaScoped) {
    // Let RSC layouts redirect to `/go/login` instead of bare `/login`.
    requestHeaders.set("x-lectrax-pwa-scoped", "1");
  }

  // /go/about → real /about (outside PWA scope → browser UI / not captured)
  if (pwaScoped) {
    const stripped = stripPwaScopePrefix(originalPath);
    if (isMarketingPath(stripped) && stripped !== "/") {
      const marketingUrl = request.nextUrl.clone();
      marketingUrl.pathname = stripped;
      return applyCspHeaders(NextResponse.redirect(marketingUrl), nonce, cspMode);
    }
  }

  const internalPath = pwaScoped ? stripPwaScopePrefix(originalPath) : originalPath;
  const internalUrl = request.nextUrl.clone();
  internalUrl.pathname = internalPath;

  // Session / auth logic sees unprefixed routes; browser URL can stay under /go/*.
  const observedRequest = new NextRequest(internalUrl, {
    headers: requestHeaders,
  });

  const abuseResponse = rejectIfAbusiveRequest(observedRequest);
  if (abuseResponse) {
    return applyCspHeaders(abuseResponse, nonce, cspMode);
  }

  const csrfResponse = rejectIfCsrfViolation(observedRequest);
  if (csrfResponse) {
    return applyCspHeaders(csrfResponse, nonce, cspMode);
  }

  const response = await updateSession(observedRequest, { pwaScoped });

  return applyCspHeaders(response, nonce, cspMode);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|robots.txt|icons/|splash/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html)$).*)",
  ],
};
