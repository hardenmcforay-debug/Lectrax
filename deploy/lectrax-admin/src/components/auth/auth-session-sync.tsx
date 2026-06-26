"use client";

import { useEffect } from "react";
import { clearClientStorageAfterAuthReset } from "@/lib/auth/client-sign-out";
import { isProtectedPortalPath } from "@/lib/auth/route-protection";
import { PASSWORD_RESET_PAGE_PATH } from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/client";

/** Clear client caches when the Supabase session ends (logout, expiry, remote sign-out). */
export function AuthSessionSync() {
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        if (window.location.pathname !== PASSWORD_RESET_PAGE_PATH) {
          window.location.replace(PASSWORD_RESET_PAGE_PATH);
        }
        return;
      }

      if (event === "SIGNED_OUT") {
        clearClientStorageAfterAuthReset();
        if (isProtectedPortalPath(window.location.pathname)) {
          window.location.replace("/login");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
