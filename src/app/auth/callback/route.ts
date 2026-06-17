import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPlatformAdminLoginRedirectUrl,
  isMainAppDeployment,
} from "@/lib/auth/admin-deployment";
import {
  resolveUserRoleOrNull,
  resolvePostLoginRedirect,
  getLoginFailureUrl,
} from "@/lib/auth/roles";
import { syncStudentCollegeIdFromSignupMetadata } from "@/lib/auth/sync-signup-profile";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
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

      const role = resolveUserRoleOrNull(profile?.role, user);
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
  }

  return NextResponse.redirect(getLoginFailureUrl(origin));
}
