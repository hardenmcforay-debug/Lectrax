"use client";

import { useEffect } from "react";
import { clearClientStorageAfterAuthReset } from "@/lib/auth/client-sign-out";
import { createClient } from "@/lib/supabase/client";

/** Clear client caches when the Supabase session ends (logout, expiry, remote sign-out). */
export function AuthSessionSync() {
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearClientStorageAfterAuthReset();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
