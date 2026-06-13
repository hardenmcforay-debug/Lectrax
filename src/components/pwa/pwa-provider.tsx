"use client";

import { useEffect } from "react";
import { isStandaloneMode } from "@/lib/pwa/detect";

export function PwaProvider() {
  useEffect(() => {
    if (isStandaloneMode()) {
      document.documentElement.dataset.pwaStandalone = "true";
    }

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;

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
  }, []);

  return null;
}
