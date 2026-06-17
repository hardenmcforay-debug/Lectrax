"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const AUTH_BACK_PATHS = ["/login", "/signup"];

/**
 * Ensures the browser back button on sign-in/sign-up always returns to the landing page.
 */
export function AuthBackToLanding() {
  const pathname = usePathname();
  const router = useRouter();
  const historyGuardReady = useRef(false);

  useEffect(() => {
    if (!AUTH_BACK_PATHS.includes(pathname)) {
      historyGuardReady.current = false;
      return;
    }

    if (!historyGuardReady.current) {
      window.history.pushState({ lectraxAuthBack: true }, "", window.location.href);
      historyGuardReady.current = true;
    }

    const onPopState = () => {
      historyGuardReady.current = false;
      router.replace("/");
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [pathname, router]);

  return null;
}
