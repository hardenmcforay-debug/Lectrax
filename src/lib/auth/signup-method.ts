import { isSyntheticPhoneAuthEmail } from "@/lib/auth/phone-number";

export type SignupMethod = "phone" | "email";

export function getSignupMethod(
  userMetadata: Record<string, unknown> | undefined
): SignupMethod | null {
  const method = userMetadata?.signup_method;
  if (method === "phone" || method === "email") {
    return method;
  }
  return null;
}

/** True when the account was created using a phone number as the primary identifier. */
export function isPhoneSignupAccount(params: {
  authEmail: string | null | undefined;
  userMetadata?: Record<string, unknown> | undefined;
}): boolean {
  const method = getSignupMethod(params.userMetadata);
  if (method === "phone") return true;
  if (method === "email") return false;

  const auth = params.authEmail?.trim().toLowerCase() ?? "";
  if (isSyntheticPhoneAuthEmail(auth)) {
    return true;
  }

  const metaPhone = params.userMetadata?.phone;
  return typeof metaPhone === "string" && metaPhone.trim().length > 0;
}

export function hasAcknowledgedPortalOnboarding(
  userMetadata: Record<string, unknown> | undefined
): boolean {
  const value = userMetadata?.portal_onboarding_acknowledged_at;
  return typeof value === "string" && value.trim().length > 0;
}

export const PORTAL_ONBOARDING_ACKNOWLEDGED_KEY = "portal_onboarding_acknowledged_at";

export function getPortalSettingsPath(role: "student" | "lecturer"): string {
  return role === "student" ? "/student/settings" : "/lecturer/settings";
}
