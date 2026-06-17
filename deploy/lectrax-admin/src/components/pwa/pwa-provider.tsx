"use client";

import { useLayoutEffect } from "react";
import { PWA_SERVICE_WORKER_PATH } from "@/lib/pwa/config";
import { applyPortalChromeMarks } from "@/lib/pwa/portal-chrome";

export function PwaProvider() {
  useLayoutEffect(() => {
    applyPortalChromeMarks();

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

    const register = async () => {
      try {
        await navigator.serviceWorker.register(PWA_SERVICE_WORKER_PATH, { scope: "/" });
      } catch {
        // Service worker registration is best-effort.
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      window.removeEventListener("pageshow", handleResume);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
