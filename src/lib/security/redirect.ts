import { type NextRequest, NextResponse } from "next/server";
import { isProduction } from "@/lib/security/transport";

/**
 * Redirect HTTP requests to HTTPS in production.
 * Relies on x-forwarded-proto from the hosting platform (e.g. Vercel).
 */
export function enforceHttpsRedirect(request: NextRequest): NextResponse | null {
  if (!isProduction()) {
    return null;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (!forwardedProto) {
    return null;
  }

  if (forwardedProto.split(",")[0]?.trim() === "https") {
    return null;
  }

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  return NextResponse.redirect(url, 308);
}
