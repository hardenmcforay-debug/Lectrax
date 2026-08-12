import { getPasswordResetCallbackUrl } from "@/lib/auth/password-recovery";
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
  const redirectTo = getPasswordResetCallbackUrl(window.location.origin);

  // Errors are swallowed by callers — response must not reveal account existence.
  await supabase.auth.resetPasswordForEmail(normalized, { redirectTo });
}
