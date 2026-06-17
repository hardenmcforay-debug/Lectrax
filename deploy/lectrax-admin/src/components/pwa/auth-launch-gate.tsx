"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasClientSupabaseAuthCookies } from "@/lib/auth/client-cookies";
import { resolveClientRoleAfterAuth } from "@/lib/auth/resolve-client-role";
import { getDashboardPath } from "@/lib/auth/roles";
import { AppLaunchSplash } from "@/components/pwa/app-launch-splash";

type LaunchState = "idle" | "checking" | "guest" | "redirecting";

export function AuthLaunchGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<LaunchState>("idle");

  useLayoutEffect(() => {
    if (pathname !== "/") {
      setState("guest");
      return;
    }

    if (!hasClientSupabaseAuthCookies()) {
      setState("guest");
      return;
    }

    let cancelled = false;
    setState("checking");

    async function restoreSession() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (!session) {
          setState("guest");
          return;
        }

        setState("redirecting");
        const { role, networkFailure } = await resolveClientRoleAfterAuth(supabase);

        if (cancelled) return;

        if (role) {
          window.location.replace(getDashboardPath(role));
          return;
        }

        if (networkFailure) {
          setState("guest");
          return;
        }

        setState("guest");
      } catch {
        if (!cancelled) {
          setState("guest");
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (pathname !== "/") {
    return children;
  }

  if (state === "checking" || state === "redirecting") {
    return <AppLaunchSplash />;
  }

  return children;
}
