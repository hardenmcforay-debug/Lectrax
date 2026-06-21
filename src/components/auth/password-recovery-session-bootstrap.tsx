"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Establish a recovery session from Supabase email link query/hash params. */
export function PasswordRecoverySessionBootstrap() {
  useEffect(() => {
    const supabase = createClient();

    async function bootstrapRecoverySession() {
      const currentUrl = new URL(window.location.href);
      const code = currentUrl.searchParams.get("code");
      const tokenHash = currentUrl.searchParams.get("token_hash");
      const type = currentUrl.searchParams.get("type");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          window.history.replaceState({}, "", "/reset-password");
        }
        return;
      }

      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        if (!error) {
          window.history.replaceState({}, "", "/reset-password");
        }
        return;
      }

      // Implicit-flow links may land with tokens in the hash fragment.
      if (window.location.hash.includes("type=recovery")) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          window.history.replaceState({}, "", "/reset-password");
        }
      }
    }

    void bootstrapRecoverySession();
  }, []);

  return null;
}
