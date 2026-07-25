import { getPasswordResetCallbackUrl } from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/client";

/**
 * Starts the Supabase recovery email from the browser so the PKCE code_verifier
 * is stored in cookies. Must run in the same browser that will open the email link.
 */
export async function requestPasswordResetEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const supabase = createClient();
  const redirectTo = getPasswordResetCallbackUrl(window.location.origin);

  await supabase.auth.resetPasswordForEmail(normalized, { redirectTo });
}
