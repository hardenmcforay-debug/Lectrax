import { getPasswordResetCallbackUrl } from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/client";
import { BUSINESS_EVENTS, trackBusinessEvent } from "@/lib/observability/business-events";

/**
 * Starts the Supabase recovery email from the browser so the PKCE code_verifier
 * is stored in cookies. Must run in the same browser that will open the email link.
 */
export async function requestPasswordResetEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const supabase = createClient();
  const redirectTo = getPasswordResetCallbackUrl(window.location.origin);

  const { error } = await supabase.auth.resetPasswordForEmail(normalized, { redirectTo });
  if (error) {
    // Enumeration-safe: still track operational email delivery failures privately.
    trackBusinessEvent(
      BUSINESS_EVENTS.PASSWORD_RESET_EMAIL_FAILURE,
      { reason: error.message },
      { severity: "error" }
    );
    trackBusinessEvent(BUSINESS_EVENTS.EMAIL_FAILURE, {
      channel: "supabase_auth_reset",
      reason: error.message,
    });
  }
}
