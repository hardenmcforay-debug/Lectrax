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

function redirectToPasswordReset(origin: string): NextResponse {
  return NextResponse.redirect(`${origin}${PASSWORD_RESET_PAGE_PATH}`);
}

function copyResponseCookies(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const flowType = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";
  const isRecoveryFlow = isPasswordRecoveryCallback({ type: flowType, next });

  if (tokenHash && flowType === "recovery") {
    const response = redirectToPasswordReset(origin);
    const supabase = await createRouteHandlerClient(response);
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });

    if (!error) {
      return response;
    }

    logServerError("auth.callback.recoveryVerifyOtp", error);
    return NextResponse.redirect(getLoginFailureUrl(origin));
  }

  if (code) {
    const recoveryRedirect = isRecoveryFlow || flowType === "recovery";
    const sessionResponse = recoveryRedirect
      ? redirectToPasswordReset(origin)
      : NextResponse.redirect(`${origin}/`);

    const supabase = await createRouteHandlerClient(sessionResponse);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (recoveryRedirect) {
        return sessionResponse;
      }

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
        await supabase.auth.signOut();
        return NextResponse.redirect(getLoginFailureUrl(origin));
      }

      if (isMainAppDeployment() && role === "platform_admin") {
        await supabase.auth.signOut();
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
