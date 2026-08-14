"use client";

import { useEffect } from "react";
import { clearClientStorageAfterAuthReset } from "@/lib/auth/client-sign-out";
import { isProtectedPortalPath } from "@/lib/auth/route-protection";
import { PASSWORD_RESET_PAGE_PATH } from "@/lib/auth/password-recovery";
import { getClientAuthEntryPath } from "@/lib/pwa/config";
import { createClient } from "@/lib/supabase/client";

/** Clear client caches when the Supabase session ends (logout, expiry, remote sign-out). */
export function AuthSessionSync() {
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // Keep recovery on the site path so it matches the site PKCE/session cookies.
        if (window.location.pathname !== PASSWORD_RESET_PAGE_PATH) {
          const url = new URL(window.location.href);
          window.location.replace(`${PASSWORD_RESET_PAGE_PATH}${url.search}${url.hash}`);
        }
        return;
      }

      if (event === "SIGNED_OUT") {
        if (window.location.pathname === PASSWORD_RESET_PAGE_PATH) {
          return;
        }
        // Confirm the session is actually gone — spurious SIGNED_OUT can fire after
        // cross-site returns (e.g. payment gateway) when a transient auth fetch fails.
        void (async () => {
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session) return;
          } catch {
            // Network failure while confirming — do not force logout.
            return;
          }

          clearClientStorageAfterAuthReset();
          if (isProtectedPortalPath(window.location.pathname)) {
            window.location.replace(getClientAuthEntryPath());
          }
        })();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
