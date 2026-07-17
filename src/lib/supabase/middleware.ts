import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";
import {
  AUTH_ROUTES,
  isPublicAuthApiRoute,
  PUBLIC_API_ROUTES,
  PUBLIC_ROUTES,
} from "@/lib/constants";
import {
  getAdminAppUrl,
  getPlatformAdminLoginRedirectUrl,
  getRoleHomeUrl,
  isAbsoluteUrl,
  isAdminDeployment,
  isAdminHostedSeparately,
  isMainAppDeployment,
} from "@/lib/auth/admin-deployment";
import { getRequiredApiRole, getRequiredPortalRole } from "@/lib/auth/route-protection";
import { isUserRole, resolveUserRoleOrNull } from "@/lib/auth/roles";
import {
  hasSupabaseAuthCookies,
  isDefinitiveAuthError,
  isTransientDbError,
  isTransientError,
} from "@/lib/errors/classify";
import { getPublicSupabaseEnv } from "@/lib/env";
import { withSecureCookieOptions } from "@/lib/security/cookies";

/** Preserve Set-Cookie headers from the Supabase response onto a redirect/JSON response. */
function withSessionCookies(
  source: NextResponse,
  target: NextResponse
): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value);
  });
  return target;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  let url: string;
  let anonKey: string;
  try {
    ({ url, anonKey } = getPublicSupabaseEnv());
  } catch {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Application configuration error. Contact support." },
        { status: 503 }
      );
    }
    throw new Error("Missing Supabase environment variables");
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: CookieOptions;
          }>,
          headers: Record<string, string>
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, withSecureCookieOptions(options))
          );
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  if (pathname === "/reset-password") {
    return supabaseResponse;
  }

  const recoveryType = request.nextUrl.searchParams.get("type");
  if (
    (pathname === "/login" || pathname === "/") &&
    (recoveryType === "recovery" || request.nextUrl.searchParams.has("token_hash"))
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/reset-password";
    return withSessionCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
  }

  if (
    pathname === "/login" &&
    request.nextUrl.searchParams.has("code") &&
    request.nextUrl.searchParams.get("next") === "/reset-password"
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/reset-password";
    return withSessionCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
  }

  if (isAdminHostedSeparately() && !isAdminDeployment()) {
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      const adminUrl = getAdminAppUrl();
      if (adminUrl) {
        return withSessionCookies(
          supabaseResponse,
          NextResponse.redirect(`${adminUrl}${pathname}${request.nextUrl.search}`)
        );
      }
    }
  }

  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/")) ||
    PUBLIC_API_ROUTES.some((r) => pathname === r) ||
    isPublicAuthApiRoute(pathname) ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cron");

  const hasAuthCookies = hasSupabaseAuthCookies(request.cookies.getAll());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    if (isDefinitiveAuthError(authError)) {
      if (!isPublic) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("redirect", pathname);
        return withSessionCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
      }
      return supabaseResponse;
    }

    // Transient auth/network failures must not look like a logout.
    // Keep the user on the page (or return 503 for APIs) so they can retry.
    if (!isPublic) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please try again." },
          { status: 503 },
        );
      }

      if (hasAuthCookies || isTransientError(authError)) {
        return supabaseResponse;
      }

      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "unavailable");
      return withSessionCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
    }
  }

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return withSessionCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
  }

  if (user) {
    let role: UserRole | null = null;
    let roleServiceUnavailable = false;

    const { data: rpcRole, error: rpcError } = await supabase.rpc("get_my_role");
    if (isUserRole(rpcRole)) {
      role = rpcRole;
    } else if (rpcError && isTransientDbError(rpcError)) {
      roleServiceUnavailable = true;
    }

    if (!role && !roleServiceUnavailable) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError && isTransientDbError(profileError)) {
        roleServiceUnavailable = true;
      } else {
        role = resolveUserRoleOrNull(profile?.role);
      }
    }

    if (!role && roleServiceUnavailable) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please try again." },
          { status: 503 },
        );
      }

      // Do not force login on transient role lookup failures — preserve the session.
      return supabaseResponse;
    }

    if (!role) {
      if (!isPublic && pathname !== "/") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("error", "auth");
        redirectUrl.searchParams.delete("login_failed");
        return withSessionCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
      }
      return supabaseResponse;
    }

    const roleHome = getRoleHomeUrl(role, request.nextUrl.origin);

    if (isMainAppDeployment() && role === "platform_admin") {
      await supabase.auth.signOut();
      return withSessionCookies(
        supabaseResponse,
        NextResponse.redirect(getPlatformAdminLoginRedirectUrl(request.nextUrl.origin))
      );
    }

    if (isAdminDeployment() && role !== "platform_admin") {
      return withSessionCookies(supabaseResponse, NextResponse.redirect(roleHome));
    }

    if (pathname === "/") {
      const redirectUrl = request.nextUrl.clone();
      if (isAbsoluteUrl(roleHome)) {
        return withSessionCookies(supabaseResponse, NextResponse.redirect(roleHome));
      }
      redirectUrl.pathname = roleHome;
      redirectUrl.search = "";
      return withSessionCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
    }

    if (AUTH_ROUTES.includes(pathname)) {
      if (isAbsoluteUrl(roleHome)) {
        return withSessionCookies(supabaseResponse, NextResponse.redirect(roleHome));
      }
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = roleHome;
      return withSessionCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
    }

    const requiredApiRole = getRequiredApiRole(pathname);
    if (requiredApiRole && role !== requiredApiRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requiredPortalRole = getRequiredPortalRole(pathname);
    if (requiredPortalRole && role !== requiredPortalRole) {
      const destination = isAbsoluteUrl(roleHome)
        ? roleHome
        : new URL(roleHome, request.url).toString();
      return withSessionCookies(supabaseResponse, NextResponse.redirect(destination));
    }
  }

  return supabaseResponse;
}
