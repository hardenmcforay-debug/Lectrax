"use client";

import { useLayoutEffect } from "react";
import { isStandaloneMode } from "@/lib/pwa/detect";

function applyStandaloneDataset() {
  if (isStandaloneMode()) {
    document.documentElement.dataset.pwaStandalone = "true";
  }
}

export function PwaProvider() {
  useLayoutEffect(() => {
    applyStandaloneDataset();

    const handleResume = () => {
      applyStandaloneDataset();
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        applyStandaloneDataset();
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
    };
  }, []);

  return null;
}
