import {
  getPasswordResetAuthCallbackUrl,
  getPasswordResetCallbackUrl,
} from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/client";

/**
 * Starts the Supabase recovery email from the browser so the PKCE code_verifier
 * is stored in cookies. Must run in the same browser that will open the email link.
 *
 * Always uses the site auth cookie jar — email links open in the system browser
 * (not the installed PWA `/go` surface), so a PWA-scoped verifier would break exchange.
 */
export async function requestPasswordResetEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const supabase = createClient("site");
  const origin = window.location.origin;
  const redirectTo = getPasswordResetCallbackUrl(origin);

  // Errors are swallowed by callers — response must not reveal account existence.
  const { error } = await supabase.auth.resetPasswordForEmail(normalized, { redirectTo });
  if (!error) return;

  // Older Supabase allowlists only include /auth/callback. Still land recovery
  // there so the callback can forward to /reset-password without consuming the code.
  await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo: getPasswordResetAuthCallbackUrl(origin),
  });
}
