"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PASSWORD_RESET_PAGE_PATH } from "@/lib/auth/password-recovery";

function goToResetPasswordPage() {
  if (window.location.pathname !== PASSWORD_RESET_PAGE_PATH) {
    window.location.replace(PASSWORD_RESET_PAGE_PATH);
    return;
  }

  window.history.replaceState({}, "", PASSWORD_RESET_PAGE_PATH);
}

function hasRecoveryQueryParams(url: URL): boolean {
  if (url.searchParams.get("type") === "recovery") {
    return true;
  }

  if (url.searchParams.has("token_hash") && url.searchParams.get("type") === "recovery") {
    return true;
  }

  return url.pathname === PASSWORD_RESET_PAGE_PATH && url.searchParams.has("code");
}

function hasRecoveryHash(): boolean {
  return window.location.hash.includes("type=recovery");
}

/**
 * Global recovery handler for PWA and browser: exchange reset tokens wherever the
 * email link lands (login, home, reset page) and route to /reset-password.
 */
export function PasswordRecoverySessionBootstrap() {
  useEffect(() => {
    const supabase = createClient();
    const currentUrl = new URL(window.location.href);
    const shouldHandleRecovery =
      hasRecoveryQueryParams(currentUrl) ||
      hasRecoveryHash() ||
      currentUrl.pathname === PASSWORD_RESET_PAGE_PATH;

    if (!shouldHandleRecovery) {
      return;
    }

    async function bootstrapRecoverySession() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          goToResetPasswordPage();
        }
        return;
      }

      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        if (!error) {
          goToResetPasswordPage();
        }
        return;
      }

      if (hasRecoveryHash()) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          goToResetPasswordPage();
        }
      }
    }

    void bootstrapRecoverySession();
  }, []);

  return null;
}
