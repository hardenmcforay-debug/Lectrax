"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyPortalChromeMarks } from "@/lib/pwa/portal-chrome";
import { AppLaunchSplash } from "@/components/pwa/app-launch-splash";

const PORTAL_CHROME_READY_KEY = "lectrax-portal-chrome-ready";

type PortalLayoutGateProps = {
  children: ReactNode;
};

function hasPortalChromeReadyFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(PORTAL_CHROME_READY_KEY) === "1";
  } catch {
    return false;
  }
}

function markPortalChromeReady() {
  try {
    sessionStorage.setItem(PORTAL_CHROME_READY_KEY, "1");
  } catch {
    // sessionStorage may be unavailable in some embedded browsers.
  }
}

/**
 * Ensures PWA chrome markers and client session are ready before painting the portal shell.
 * Avoids a first-load dashboard without bottom navigation after soft post-login navigation.
 */
export function PortalLayoutGate({ children }: PortalLayoutGateProps) {
  const [ready, setReady] = useState(hasPortalChromeReadyFlag);

  useLayoutEffect(() => {
    applyPortalChromeMarks();

    if (ready) {
      applyPortalChromeMarks();
      return;
    }

    let cancelled = false;

    const supabase = createClient();
    void supabase.auth.getSession().then(() => {
      if (cancelled) return;
      markPortalChromeReady();
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [ready]);

  useLayoutEffect(() => {
    if (!ready) return;
    applyPortalChromeMarks();
  }, [ready]);

  if (!ready) {
    return <AppLaunchSplash />;
  }

  return children;
}
