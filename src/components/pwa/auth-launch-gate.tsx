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

export function AuthLaunchGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [state, setState] = useState<LaunchState>("idle");
  const onHome = pathname === "/";
  const pwaStandalone = hydrated && isRunningAsInstalledPwa();
  const hasCookies = hydrated && onHome && hasClientSupabaseAuthCookies();

  // Browser: only gate when auth cookies suggest a restore is needed.
  // Installed PWA: always gate `/` so the marketing landing never paints.
  if (onHome && state === "idle" && hydrated && (hasCookies || pwaStandalone)) {
    setState("checking");
  }

  useLayoutEffect(() => {
    if (!onHome) {
      return;
    }

    const standalone = isRunningAsInstalledPwa();
    const cookies = hasClientSupabaseAuthCookies();

    // Normal browser visit with no session cookies → keep the marketing site.
    if (!standalone && !cookies) {
      clearDomBootSplash();
      return;
    }

    let cancelled = false;

    async function resolveLaunch() {
      try {
        if (cookies) {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (cancelled) return;

          if (session) {
            setState("redirecting");
            const { role, networkFailure } = await resolveClientRoleAfterAuth(supabase);

            if (cancelled) return;

            if (role) {
              window.location.replace(getDashboardPath(role));
              return;
            }

            if (networkFailure && !standalone) {
              setState("guest");
              clearDomBootSplash();
              return;
            }
          }
        }

        if (standalone) {
          setState("redirecting");
          window.location.replace(PWA_AUTH_ENTRY);
          return;
        }

        setState("guest");
        clearDomBootSplash();
      } catch {
        if (cancelled) return;

        if (isRunningAsInstalledPwa()) {
          setState("redirecting");
          window.location.replace(PWA_AUTH_ENTRY);
          return;
        }

        setState("guest");
        clearDomBootSplash();
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

  // Installed PWA / session restore: keep the app splash (CSS already hides landing).
  if (state === "checking" || state === "redirecting" || pwaStandalone) {
    return <AppLaunchSplash />;
  }

  return children;
}
