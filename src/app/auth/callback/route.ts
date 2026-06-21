import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

function redirectToPasswordReset(origin: string): NextResponse {
  return NextResponse.redirect(`${origin}${PASSWORD_RESET_PAGE_PATH}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const flowType = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";
  const isRecoveryFlow = isPasswordRecoveryCallback({ type: flowType, next });

  const supabase = await createClient();

  if (tokenHash && flowType === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });

    if (!error) {
      return redirectToPasswordReset(origin);
    }

    logServerError("auth.callback.recoveryVerifyOtp", error);
    return NextResponse.redirect(getLoginFailureUrl(origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (isRecoveryFlow || flowType === "recovery") {
        return redirectToPasswordReset(origin);
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
      return NextResponse.redirect(`${origin}${dest}`);
    }

    logServerError("auth.callback.exchangeCodeForSession", error);
  }

  return NextResponse.redirect(getLoginFailureUrl(origin));
}
