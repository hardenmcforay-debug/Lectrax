import { isRunningAsInstalledPwa } from "@/lib/pwa/detect";
import { isPwaScopePath, toPwaScopePath } from "@/lib/pwa/scope";

/** Browser site vs installed PWA (`/go/*`) — each keeps an independent auth session. */
export type AuthSurface = "site" | "pwa";

/** Sent on browser API calls so unscoped `/api/*` handlers use the correct cookie jar. */
export const AUTH_SURFACE_HEADER = "x-lectrax-auth-surface";

export const PWA_SCOPED_HEADER = "x-lectrax-pwa-scoped";

export function parseAuthSurface(value: string | null | undefined): AuthSurface | null {
  if (value === "pwa" || value === "site") return value;
  return null;
}

export function getAuthSurfaceFromPath(pathname: string): AuthSurface {
  return isPwaScopePath(pathname) ? "pwa" : "site";
}

/** Which auth cookie namespace the current browser document should use. */
export function getClientAuthSurface(): AuthSurface {
  if (typeof window === "undefined") return "site";
  if (isRunningAsInstalledPwa() || isPwaScopePath(window.location.pathname)) {
    return "pwa";
  }
  return "site";
}

/**
 * Default Supabase SSR storage key, optionally namespaced for the PWA surface.
 * Site keeps `sb-<ref>-auth-token`; PWA uses `sb-<ref>-auth-token-pwa`.
 */
export function getSupabaseAuthStorageKey(
  supabaseUrl: string,
  surface: AuthSurface
): string {
  const hostname = new URL(supabaseUrl).hostname;
  const projectRef = hostname.split(".")[0] || "supabase";
  const base = `sb-${projectRef}-auth-token`;
  return surface === "pwa" ? `${base}-pwa` : base;
}

export function isPwaAuthCookieName(name: string): boolean {
  return name.includes("-auth-token-pwa");
}

/** Rewrite same-origin `/api/*` paths through `/go` when the client is on the PWA surface. */
export function toAuthSurfaceApiUrl(url: string, surface: AuthSurface = getClientAuthSurface()): string {
  if (surface !== "pwa") return url;

  if (url.startsWith("/api/")) {
    return toPwaScopePath(url);
  }

  if (typeof window === "undefined") return url;

  try {
    const parsed = new URL(url, window.location.origin);
    if (
      parsed.origin === window.location.origin &&
      parsed.pathname.startsWith("/api/") &&
      !isPwaScopePath(parsed.pathname)
    ) {
      parsed.pathname = toPwaScopePath(parsed.pathname);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Keep the original URL when parsing fails.
  }

  return url;
}
