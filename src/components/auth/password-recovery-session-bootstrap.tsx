"use client";

import { useEffect } from "react";
import {
  hasPasswordRecoveryParams,
} from "@/lib/auth/establish-password-recovery-session";
import { PASSWORD_RESET_PAGE_PATH } from "@/lib/auth/password-recovery";

function goToResetPasswordPagePreservingTokens() {
  const url = new URL(window.location.href);
  if (url.pathname === PASSWORD_RESET_PAGE_PATH) {
    return;
  }

  // Keep query + hash so the reset page can establish the recovery session.
  window.location.replace(`${PASSWORD_RESET_PAGE_PATH}${url.search}${url.hash}`);
}

/**
 * If a recovery email lands anywhere except /reset-password, send the browser
 * there with tokens intact. Session exchange happens on the reset page.
 */
export function PasswordRecoverySessionBootstrap() {
  useEffect(() => {
    if (!hasPasswordRecoveryParams(window.location.href)) {
      return;
    }

    goToResetPasswordPagePreservingTokens();
  }, []);

  return null;
}
