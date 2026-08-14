import type { SupabaseClient } from "@supabase/supabase-js";
import { PASSWORD_RESET_PAGE_PATH } from "@/lib/auth/password-recovery";

export type PasswordRecoveryParams = {
  code: string | null;
  tokenHash: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
};

function pickParam(search: URLSearchParams, hash: URLSearchParams, key: string): string | null {
  return search.get(key) || hash.get(key);
}

/** Read PKCE, OTP, and implicit recovery tokens from query or hash. */
export function readPasswordRecoveryParams(href: string): PasswordRecoveryParams {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  const search = url.searchParams;

  return {
    code: pickParam(search, hash, "code"),
    tokenHash: pickParam(search, hash, "token_hash"),
    accessToken: pickParam(search, hash, "access_token"),
    refreshToken: pickParam(search, hash, "refresh_token"),
    type: pickParam(search, hash, "type"),
  };
}

export function hasPasswordRecoveryParams(href: string): boolean {
  const params = readPasswordRecoveryParams(href);
  return Boolean(
    params.code ||
      params.tokenHash ||
      (params.accessToken && params.refreshToken) ||
      params.type === "recovery"
  );
}

let inFlight: Promise<boolean> | null = null;

/**
 * Turn the current URL's recovery tokens into a site-cookie session.
 *
 * The browser client uses PKCE, so Supabase's detectSessionInUrl rejects
 * implicit hash links (`#access_token&type=recovery`). Those must be applied
 * with setSession or the reset form never appears.
 */
export function establishPasswordRecoverySession(
  supabase: SupabaseClient
): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = establishPasswordRecoverySessionOnce(supabase).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function establishPasswordRecoverySessionOnce(
  supabase: SupabaseClient
): Promise<boolean> {
  const {
    data: { session: existing },
  } = await supabase.auth.getSession();
  if (existing) {
    return true;
  }

  const params = readPasswordRecoveryParams(window.location.href);

  if (params.accessToken && params.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    });
    if (!error) {
      return true;
    }
  }

  if (params.tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: params.tokenHash,
    });
    if (!error) {
      return true;
    }
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (!error) {
      return true;
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return Boolean(session);
}

export function clearPasswordRecoveryTokensFromUrl() {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== PASSWORD_RESET_PAGE_PATH) return;

  const url = new URL(window.location.href);
  if (!url.search && !url.hash) return;

  window.history.replaceState(window.history.state, "", PASSWORD_RESET_PAGE_PATH);
}
