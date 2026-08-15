"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isPasswordRecoveryLandingPath } from "@/lib/auth/password-recovery";
import { isRunningAsInstalledPwa } from "@/lib/pwa/detect";
import {
  isAppShellPath,
  isMarketingPath,
  isPwaScopePath,
  rewriteUnscopedAppShellHref,
  toPwaScopePath,
} from "@/lib/pwa/scope";

function rewriteInstalledPwaFetchInput(input: RequestInfo | URL): RequestInfo | URL {
  const href =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  const rewritten = rewriteUnscopedAppShellHref(href, window.location.origin);
  if (!rewritten) return input;

  if (typeof input === "string") return rewritten;
  if (input instanceof URL) return new URL(rewritten, window.location.origin);
  return new Request(new URL(rewritten, window.location.origin), input);
}

/**
 * In the installed PWA, keep navigations under `/go/*` (manifest scope) and
 * send marketing URLs out to a normal browser tab when possible.
 *
 * Programmatic `router.push("/lecturer/...")` (and RSC prefetch) also leave
 * `/go`, hit site cookies, and flash login. Rewrite those requests here so
 * Create Assignment and similar actions cannot drop the PWA session.
 */
export function PwaScopeNavigator() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isRunningAsInstalledPwa()) return;

    const originalFetch = window.fetch.bind(window);
    function lectraxPwaScopedFetch(
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      return originalFetch(rewriteInstalledPwaFetchInput(input), init);
    }
    window.fetch = lectraxPwaScopedFetch;

    function restoreFetch() {
      if (window.fetch === lectraxPwaScopedFetch) {
        window.fetch = originalFetch;
      }
    }

    if (pathname && !isPwaScopePath(pathname) && isAppShellPath(pathname)) {
      // Recovery must stay on the site path so PKCE/session cookies match the email link.
      if (isPasswordRecoveryLandingPath(pathname)) {
        return restoreFetch;
      }
      router.replace(toPwaScopePath(pathname) + window.location.search + window.location.hash);
      return restoreFetch;
    }

    function onClick(event: MouseEvent) {
      if (!isRunningAsInstalledPwa()) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      if (isMarketingPath(url.pathname)) {
        event.preventDefault();
        // Leave the installed app for the public marketing site.
        window.open(url.href, "_blank", "noopener,noreferrer");
        return;
      }

      if (
        isAppShellPath(url.pathname) &&
        !isPwaScopePath(url.pathname) &&
        !isPasswordRecoveryLandingPath(url.pathname)
      ) {
        event.preventDefault();
        router.push(toPwaScopePath(url.pathname) + url.search + url.hash);
      }
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      restoreFetch();
    };
  }, [pathname, router]);

  return null;
}
