"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isPasswordRecoveryLandingPath } from "@/lib/auth/password-recovery";
import { isRunningAsInstalledPwa } from "@/lib/pwa/detect";
import {
  isAppShellPath,
  isMarketingPath,
  isPwaScopePath,
  toPwaScopePath,
} from "@/lib/pwa/scope";

/**
 * In the installed PWA, keep navigations under `/go/*` (manifest scope) and
 * send marketing URLs out to a normal browser tab when possible.
 */
export function PwaScopeNavigator() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isRunningAsInstalledPwa()) return;

    if (pathname && !isPwaScopePath(pathname) && isAppShellPath(pathname)) {
      // Recovery must stay on the site path so PKCE/session cookies match the email link.
      if (isPasswordRecoveryLandingPath(pathname)) {
        return;
      }
      router.replace(toPwaScopePath(pathname) + window.location.search + window.location.hash);
      return;
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
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, router]);

  return null;
}
