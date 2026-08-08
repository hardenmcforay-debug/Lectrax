"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasClientSupabaseAuthCookies } from "@/lib/auth/client-cookies";
import { resolveClientRoleAfterAuth } from "@/lib/auth/resolve-client-role";
import { getDashboardPath } from "@/lib/auth/roles";
import { AppLaunchSplash } from "@/components/pwa/app-launch-splash";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { isRunningAsInstalledPwa } from "@/lib/pwa/detect";

type LaunchState = "idle" | "checking" | "guest" | "redirecting";

const PWA_AUTH_ENTRY = "/login";

function clearDomBootSplash() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("pwa-booting");
  document.documentElement.dataset.pwaReady = "true";
  document.getElementById("lectrax-pwa-boot-splash")?.remove();
}

/**
 * Gates `/` only when the document is actually running as an installed PWA
 * (display-mode standalone / iOS home-screen). Normal browser tabs — including
 * authenticated sessions and devices that previously installed the PWA — always
 * keep the public landing page.
 */
export function AuthLaunchGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [state, setState] = useState<LaunchState>("idle");
  const onHome = pathname === "/";
  const pwaStandalone = hydrated && isRunningAsInstalledPwa();

  if (onHome && state === "idle" && hydrated && pwaStandalone) {
    setState("checking");
  }

  useLayoutEffect(() => {
    if (!onHome) {
      return;
    }

    const standalone = isRunningAsInstalledPwa();

    // Normal browser visit → keep the marketing site (auth or not).
    if (!standalone) {
      clearDomBootSplash();
      return;
    }

    let cancelled = false;

    async function resolveLaunch() {
      try {
        const cookies = hasClientSupabaseAuthCookies();

        if (cookies) {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (cancelled) return;

          if (session) {
            setState("redirecting");
            const { role } = await resolveClientRoleAfterAuth(supabase);

            if (cancelled) return;

            if (role) {
              window.location.replace(getDashboardPath(role));
              return;
            }
          }
        }

        setState("redirecting");
        window.location.replace(PWA_AUTH_ENTRY);
      } catch {
        if (cancelled) return;

        setState("redirecting");
        window.location.replace(PWA_AUTH_ENTRY);
      }
    }

    void resolveLaunch();

    return () => {
      cancelled = true;
    };
  }, [onHome]);

  if (!onHome) {
    return children;
  }

  // Installed PWA only: keep the app splash while routing into the app.
  if (state === "checking" || state === "redirecting" || pwaStandalone) {
    return <AppLaunchSplash />;
  }

  return children;
}
