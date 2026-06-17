"use client";

import { useInsertionEffect, useLayoutEffect } from "react";
import { applyPortalChromeMarks } from "@/lib/pwa/portal-chrome";

export function PwaProvider() {
  if (typeof document !== "undefined") {
    applyPortalChromeMarks();
  }

  useInsertionEffect(() => {
    applyPortalChromeMarks();
  }, []);

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
    window.visualViewport?.addEventListener("resize", handleResume);

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("pageshow", handleResume);
        document.removeEventListener("visibilitychange", handleVisibility);
        window.visualViewport?.removeEventListener("resize", handleResume);
      };
    }

    if (process.env.NODE_ENV === "development") {
      return () => {
        window.removeEventListener("pageshow", handleResume);
        document.removeEventListener("visibilitychange", handleVisibility);
        window.visualViewport?.removeEventListener("resize", handleResume);
      };
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
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
      window.visualViewport?.removeEventListener("resize", handleResume);
    };
  }, []);

  return null;
}
