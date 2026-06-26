"use client";

import { useEffect } from "react";
import { clearClientStorageAfterAuthReset } from "@/lib/auth/client-sign-out";
import { isProtectedPortalPath } from "@/lib/auth/route-protection";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side session re-validation for portal pages.
 * Prevents stale bfcache / PWA snapshots from showing protected content after logout or expiry.
 */
export function ProtectedSessionGuard({ loginPath = "/login" }: { loginPath?: string }) {
  useEffect(() => {
    const supabase = createClient();

    async function assertSession() {
      if (!isProtectedPortalPath(window.location.pathname)) return;

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        clearClientStorageAfterAuthReset();
        window.location.replace(loginPath);
      }
    }

    void assertSession();

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void assertSession();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void assertSession();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loginPath]);

  return null;
}
