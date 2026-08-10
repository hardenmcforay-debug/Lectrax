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
  isDefinitiveAuthError,
  isTransientDbError,
  isTransientError,
} from "@/lib/errors/classify";
import { getPublicSupabaseEnv } from "@/lib/env";
import {
  getSupabaseAuthStorageKey,
  type AuthSurface,
} from "@/lib/auth/auth-surface";
import {
  hasSupabaseAuthCookies,
  withSecureCookieOptions,
} from "@/lib/security/cookies";
import { toPwaScopePath } from "@/lib/pwa/scope";

export type UpdateSessionOptions = {
  /** Browser URL is under `/go/*` (installed PWA scope). */
  pwaScoped?: boolean;
  /** Explicit auth cookie namespace (defaults from `pwaScoped`). */
  authSurface?: AuthSurface;
};

/** Preserve Set-Cookie headers from the Supabase response onto a redirect/JSON response. */
function withSessionCookies(
  source: NextResponse,
  target: NextResponse
): NextResponse {
  const setCookies =
    typeof source.headers.getSetCookie === "function"
      ? source.headers.getSetCookie()
      : [];

  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      target.headers.append("Set-Cookie", cookie);
    }
    return target;
  }

  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value);
  });
  return target;
}

function continueResponse(request: NextRequest, pwaScoped: boolean): NextResponse {
  if (pwaScoped) {
    // Keep the browser on `/go/...` while rendering the unprefixed App Router path.
    return NextResponse.rewrite(request.nextUrl, {
      request: {
        headers: request.headers,
      },
    });
  }

  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

function appRedirectPath(pathname: string, pwaScoped: boolean): string {
  if (!pwaScoped || isAbsoluteUrl(pathname)) return pathname;
  return toPwaScopePath(pathname);
}

export async function updateSession(
  request: NextRequest,
  options: UpdateSessionOptions = {}
) {
  const pwaScoped = Boolean(options.pwaScoped);
  const authSurface: AuthSurface =
    options.authSurface ?? (pwaScoped ? "pwa" : "site");

  // Forward request headers (incl. x-nonce / CSP) into the RSC render pipeline.
  let supabaseResponse = continueResponse(request, pwaScoped);

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
      cookieOptions: {
        name: getSupabaseAuthStorageKey(url, authSurface),
        path: "/",
        sameSite: "lax",
      },
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
          supabaseResponse = continueResponse(request, pwaScoped);
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
    redirectUrl.pathname = appRedirectPath("/reset-password", pwaScoped);
    return withSessionCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
  }

  if (
    pathname === "/login" &&
    request.nextUrl.searchParams.has("code") &&
    request.nextUrl.searchParams.get("next") === "/reset-password"
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = appRedirectPath("/reset-password", pwaScoped);
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
    /^\/api\/partnerships\/payments\/[^/]+\/status$/.test(pathname) ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cron");

  const hasAuthCookies = hasSupabaseAuthCookies(
    request.cookies.getAll(),
    authSurface
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    if (isDefinitiveAuthError(authError)) {
      if (!isPublic) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = appRedirectPath("/login", pwaScoped);
        redirectUrl.searchParams.set("redirect", pathname);
        return withSessionCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
      }
      return supabaseResponse;
    }

    // Transient auth/network failures must not look like a logout.
    // Keep the user on the page (or return 503 for APIs) so they can retry.
    if (!isPublic) {
      if (pathname.startsWith("/api/")) {
        return withSessionCookies(
          supabaseResponse,
          NextResponse.json(
            { error: "Service temporarily unavailable. Please try again." },
            { status: 503 },
          )
        );
      }

      if (hasAuthCookies || isTransientError(authError)) {
        return supabaseResponse;
      }

      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = appRedirectPath("/login", pwaScoped);
      redirectUrl.searchParams.set("error", "unavailable");
      return withSessionCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
    }
  }

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = appRedirectPath("/login", pwaScoped);
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
        return withSessionCookies(
          supabaseResponse,
          NextResponse.json(
            { error: "Service temporarily unavailable. Please try again." },
            { status: 503 },
          )
        );
      }

      // Do not force login on transient role lookup failures — preserve the session.
      return supabaseResponse;
    }

    if (!role) {
      if (!isPublic && pathname !== "/") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = appRedirectPath("/login", pwaScoped);
        redirectUrl.searchParams.set("error", "auth");
        redirectUrl.searchParams.delete("login_failed");
        return withSessionCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
      }
      return supabaseResponse;
    }

    const roleHome = getRoleHomeUrl(role, request.nextUrl.origin);

    if (isMainAppDeployment() && role === "platform_admin") {
      // Local only — do not revoke refresh tokens used by the other surface.
      await supabase.auth.signOut({ scope: "local" });
      return withSessionCookies(
        supabaseResponse,
        NextResponse.redirect(getPlatformAdminLoginRedirectUrl(request.nextUrl.origin))
      );
    }

    if (isAdminDeployment() && role !== "platform_admin") {
      return withSessionCookies(supabaseResponse, NextResponse.redirect(roleHome));
    }

    // `/` is always the public marketing landing in normal browsers.
    // Standalone PWA entry uses manifest start_url `/go/login` + client launch gate.

    if (AUTH_ROUTES.includes(pathname)) {
      if (isAbsoluteUrl(roleHome)) {
        return withSessionCookies(supabaseResponse, NextResponse.redirect(roleHome));
      }
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = appRedirectPath(roleHome, pwaScoped);
      return withSessionCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
    }

    const requiredApiRole = getRequiredApiRole(pathname);
    if (requiredApiRole && role !== requiredApiRole) {
      return withSessionCookies(
        supabaseResponse,
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }

    const requiredPortalRole = getRequiredPortalRole(pathname);
    if (requiredPortalRole && role !== requiredPortalRole) {
      const destination = isAbsoluteUrl(roleHome)
        ? roleHome
        : new URL(appRedirectPath(roleHome, pwaScoped), request.url).toString();
      return withSessionCookies(supabaseResponse, NextResponse.redirect(destination));
    }
  }

  return supabaseResponse;
}
