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
import { isUserRole, resolveUserRoleOrNull } from "@/lib/auth/roles";
import {
  hasSupabaseAuthCookies,
  isDefinitiveAuthError,
  isTransientDbError,
} from "@/lib/errors/classify";
import { getPublicSupabaseEnv } from "@/lib/env";
import { withSecureCookieOptions } from "@/lib/security/cookies";

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
    const url = request.nextUrl.clone();
    url.pathname = "/reset-password";
    return NextResponse.redirect(url);
  }

  if (
    pathname === "/login" &&
    request.nextUrl.searchParams.has("code") &&
    request.nextUrl.searchParams.get("next") === "/reset-password"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/reset-password";
    return NextResponse.redirect(url);
  }

  if (isAdminHostedSeparately() && !isAdminDeployment()) {
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      const adminUrl = getAdminAppUrl();
      if (adminUrl) {
        return NextResponse.redirect(`${adminUrl}${pathname}${request.nextUrl.search}`);
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
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    if (!isPublic && hasAuthCookies) {
      return supabaseResponse;
    }
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
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
      return supabaseResponse;
    }

    if (!role) {
      if (!isPublic && pathname !== "/") {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("error", "auth");
        url.searchParams.delete("login_failed");
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    const roleHome = getRoleHomeUrl(role, request.nextUrl.origin);

    if (isMainAppDeployment() && role === "platform_admin") {
      await supabase.auth.signOut();
      return NextResponse.redirect(getPlatformAdminLoginRedirectUrl(request.nextUrl.origin));
    }

    if (isAdminDeployment() && role !== "platform_admin") {
      return NextResponse.redirect(roleHome);
    }

    if (pathname === "/") {
      const url = request.nextUrl.clone();
      if (isAbsoluteUrl(roleHome)) {
        return NextResponse.redirect(roleHome);
      }
      url.pathname = roleHome;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (AUTH_ROUTES.includes(pathname)) {
      if (isAbsoluteUrl(roleHome)) {
        return NextResponse.redirect(roleHome);
      }
      const url = request.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/admin") && role !== "platform_admin") {
      const destination = isAbsoluteUrl(roleHome)
        ? roleHome
        : new URL(roleHome, request.url).toString();
      return NextResponse.redirect(destination);
    }
    if (pathname.startsWith("/lecturer") && role !== "lecturer") {
      const destination = isAbsoluteUrl(roleHome)
        ? roleHome
        : new URL(roleHome, request.url).toString();
      return NextResponse.redirect(destination);
    }
    if (pathname.startsWith("/student") && role !== "student") {
      const destination = isAbsoluteUrl(roleHome)
        ? roleHome
        : new URL(roleHome, request.url).toString();
      return NextResponse.redirect(destination);
    }
  }

  return supabaseResponse;
}
