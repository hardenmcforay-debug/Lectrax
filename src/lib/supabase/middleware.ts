import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";
import { AUTH_ROUTES, PUBLIC_API_ROUTES, PUBLIC_ROUTES } from "@/lib/constants";
import { getDashboardPath, isUserRole, resolveUserRoleOrNull } from "@/lib/auth/roles";
import {
  hasSupabaseAuthCookies,
  isDefinitiveAuthError,
  isTransientDbError,
} from "@/lib/errors/classify";
import { getPublicSupabaseEnv } from "@/lib/env";

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
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/")) ||
    PUBLIC_API_ROUTES.some((r) => pathname === r) ||
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
        role = resolveUserRoleOrNull(profile?.role, user);
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

    const roleHome = getDashboardPath(role);

    if (AUTH_ROUTES.includes(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/admin") && role !== "platform_admin") {
      return NextResponse.redirect(new URL(roleHome, request.url));
    }
    if (pathname.startsWith("/lecturer") && role !== "lecturer") {
      return NextResponse.redirect(new URL(roleHome, request.url));
    }
    if (pathname.startsWith("/student") && role !== "student") {
      return NextResponse.redirect(new URL(roleHome, request.url));
    }
  }

  return supabaseResponse;
}
