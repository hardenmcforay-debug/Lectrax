import { type NextRequest } from "next/server";
import { enforceHttpsRedirect } from "@/lib/security/redirect";
import { rejectIfAbusiveRequest } from "@/lib/security/api-abuse";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const httpsRedirect = enforceHttpsRedirect(request);
  if (httpsRedirect) {
    return httpsRedirect;
  }

  const abuseResponse = rejectIfAbusiveRequest(request);
  if (abuseResponse) return abuseResponse;

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons/|splash/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
