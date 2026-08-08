"use client";

import { useLayoutEffect } from "react";
import { applyPortalChromeMarks } from "@/lib/pwa/portal-chrome";

export function PwaProvider() {
  useLayoutEffect(() => {
    applyPortalChromeMarks();
    requestAnimationFrame(() => {
      applyPortalChromeMarks();
    });

    const handleResume = () => {
      applyPortalChromeMarks();
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        applyPortalChromeMarks();
      }
    };

    window.addEventListener("pageshow", handleResume);
    document.addEventListener("visibilitychange", handleVisibility);

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("pageshow", handleResume);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    }

    if (process.env.NODE_ENV === "development") {
      return () => {
        window.removeEventListener("pageshow", handleResume);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    }

    // Register ASAP so Chromium can fire beforeinstallprompt before the hero CTA waits.
    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Service worker registration is best-effort.
      }
    };

    void register();

    return () => {
      window.removeEventListener("pageshow", handleResume);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
