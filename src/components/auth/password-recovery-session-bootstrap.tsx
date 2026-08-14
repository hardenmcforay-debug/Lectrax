"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PASSWORD_RESET_PAGE_PATH } from "@/lib/auth/password-recovery";

const EXCHANGE_LOCK_PREFIX = "lectrax:pw-reset-exchange:";

function goToResetPasswordPage() {
  // Recovery sessions live in the site cookie jar — never send users to `/go/reset-password`.
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

  if (url.searchParams.has("token_hash")) {
    return true;
  }

  return (
    url.pathname === PASSWORD_RESET_PAGE_PATH &&
    (url.searchParams.has("code") || url.searchParams.has("token_hash"))
  );
}

function hasRecoveryHash(): boolean {
  const hash = window.location.hash;
  if (hash.includes("type=recovery")) {
    return true;
  }

  return (
    window.location.pathname === PASSWORD_RESET_PAGE_PATH &&
    (hash.includes("access_token=") || hash.includes("refresh_token="))
  );
}

function claimExchangeLock(key: string): boolean {
  try {
    const storageKey = `${EXCHANGE_LOCK_PREFIX}${key}`;
    if (sessionStorage.getItem(storageKey)) {
      return false;
    }
    sessionStorage.setItem(storageKey, "1");
    return true;
  } catch {
    return true;
  }
}

/**
 * Global recovery handler for PWA and browser: exchange reset tokens wherever the
 * email link lands (login, home, reset page) and route to /reset-password.
 */
export function PasswordRecoverySessionBootstrap() {
  useEffect(() => {
    // Email recovery always completes in the browser site cookie namespace.
    const supabase = createClient("site");
    const currentUrl = new URL(window.location.href);
    const shouldHandleRecovery =
      hasRecoveryQueryParams(currentUrl) ||
      hasRecoveryHash() ||
      (currentUrl.pathname === PASSWORD_RESET_PAGE_PATH &&
        (currentUrl.searchParams.has("code") ||
          currentUrl.searchParams.has("token_hash") ||
          hasRecoveryHash()));

    if (!shouldHandleRecovery) {
      return;
    }

    async function bootstrapRecoverySession() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");

      if (code) {
        if (!claimExchangeLock(`code:${code}`)) {
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          goToResetPasswordPage();
        }
        return;
      }

      if (
        tokenHash &&
        (type === "recovery" || url.pathname === PASSWORD_RESET_PAGE_PATH)
      ) {
        if (!claimExchangeLock(`token:${tokenHash}`)) {
          return;
        }

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
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            goToResetPasswordPage();
            return;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 50));
        }
      }
    }

    void bootstrapRecoverySession();
  }, []);

  return null;
}
