import type { User } from "@supabase/supabase-js";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { hasRecoverableEmail } from "@/lib/auth/phone-number";
import {
  hasAcknowledgedPortalOnboarding,
  isPhoneSignupAccount,
} from "@/lib/auth/signup-method";
import { PortalOnboardingDialog } from "@/components/auth/portal-onboarding-dialog";

export async function PortalOnboardingGate({
  user,
  role,
}: {
  user: User;
  role: "student" | "lecturer";
}) {
  if (hasAcknowledgedPortalOnboarding(user.user_metadata)) {
    return null;
  }

  const profile = await getProfileByUserId(user.id);
  const phoneSignup = isPhoneSignupAccount({
    authEmail: user.email,
    userMetadata: user.user_metadata,
  });

  const showRecoveryEmailNotice =
    phoneSignup && !hasRecoverableEmail(profile?.email ?? user.email);

  return (
    <PortalOnboardingDialog role={role} showRecoveryEmailNotice={showRecoveryEmailNotice} />
  );
}
