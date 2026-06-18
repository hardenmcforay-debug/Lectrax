import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { rejectIfCsrfViolation } from "@/lib/security/csrf";

export async function middleware(request: NextRequest) {
  const csrfResponse = rejectIfCsrfViolation(request);
  if (csrfResponse) return csrfResponse;

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons/|splash/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
