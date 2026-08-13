import { NextResponse } from "next/server";
import {
  getPlatformAdminLoginRedirectUrl,
  isMainAppDeployment,
} from "@/lib/auth/admin-deployment";
import {
  isPasswordRecoveryCallback,
  PASSWORD_RESET_PAGE_PATH,
} from "@/lib/auth/password-recovery";
import {
  resolveUserRoleOrNull,
  resolvePostLoginRedirect,
  getLoginFailureUrl,
} from "@/lib/auth/roles";
import { syncStudentCollegeIdFromSignupMetadata } from "@/lib/auth/sync-signup-profile";
import { logServerError } from "@/lib/errors/logger";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

function copyResponseCookies(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

function redirectRecoveryToResetPage(
  origin: string,
  params: { code: string | null; tokenHash: string | null }
): NextResponse {
  const resetUrl = new URL(PASSWORD_RESET_PAGE_PATH, origin);
  if (params.code) resetUrl.searchParams.set("code", params.code);
  if (params.tokenHash) resetUrl.searchParams.set("token_hash", params.tokenHash);
  resetUrl.searchParams.set("type", "recovery");
  return NextResponse.redirect(resetUrl);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const flowType = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";
  const isRecoveryFlow = isPasswordRecoveryCallback({ type: flowType, next });

  // Recovery codes are one-time. Email scanners prefetch this GET and would
  // burn the link before the user opens it. Pass tokens through for JS exchange.
  if (isRecoveryFlow || flowType === "recovery") {
    return redirectRecoveryToResetPage(origin, { code, tokenHash });
  }

  if (code) {
    const sessionResponse = NextResponse.redirect(`${origin}/`);

    const supabase = await createRouteHandlerClient(sessionResponse);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await syncStudentCollegeIdFromSignupMetadata(supabase, user);
      }

      const { data: profile } = user
        ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
        : { data: null };

      const role = resolveUserRoleOrNull(profile?.role);
      if (!role) {
        await supabase.auth.signOut({ scope: "local" });
        return NextResponse.redirect(getLoginFailureUrl(origin));
      }

      if (isMainAppDeployment() && role === "platform_admin") {
        await supabase.auth.signOut({ scope: "local" });
        return NextResponse.redirect(getPlatformAdminLoginRedirectUrl(origin));
      }

      const dest = resolvePostLoginRedirect(role, next === "/" ? null : next);
      const finalResponse = NextResponse.redirect(`${origin}${dest}`);
      return copyResponseCookies(sessionResponse, finalResponse);
    }

    logServerError("auth.callback.exchangeCodeForSession", error);
  }

  return NextResponse.redirect(getLoginFailureUrl(origin));
}
