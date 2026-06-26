import { z } from "zod";
import { isPhoneSignupAccount } from "@/lib/auth/signup-method";
import { sanitizePhoneInput, sanitizeTextInput } from "@/lib/security/sanitize";

/** Sierra Leone country code — used when normalizing local numbers (e.g. 076…). */
export const DEFAULT_PHONE_COUNTRY_CODE = "232";

const MAX_PHONE_LENGTH = 30;

const PHONE_AUTH_EMAIL_DOMAIN = "auth.lectrax.app";

const LOCAL_PHONE_PATTERN = /^0\d{8,}$/;
const DIGITS_ONLY_PATTERN = /^\d{8,15}$/;

export function isEmailIdentifier(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return z.string().email().safeParse(trimmed).success;
}

export function isValidPhoneInput(value: string): boolean {
  const sanitized = sanitizePhoneInput(value);
  if (!sanitized || sanitized.length < 6 || sanitized.length > MAX_PHONE_LENGTH) {
    return false;
  }

  if (!/^[\d+\-() ]+$/.test(sanitized)) {
    return false;
  }

  const digits = sanitized.replace(/\D/g, "");
  if (sanitized.startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15;
  }

  return LOCAL_PHONE_PATTERN.test(digits) || DIGITS_ONLY_PATTERN.test(digits);
}

/**
 * Normalize phone numbers to E.164-style storage: +23276123456.
 * Accepts local (076123456) and international (+23276123456) formats.
 */
export function normalizePhoneNumber(raw: string): string {
  const sanitized = sanitizePhoneInput(raw);
  if (!sanitized) {
    throw new Error("Phone number is required");
  }

  let digits = sanitized.replace(/\D/g, "");
  if (!digits) {
    throw new Error("Invalid phone number format");
  }

  if (sanitized.startsWith("+")) {
    return `+${digits}`;
  }

  if (digits.startsWith("0")) {
    digits = `${DEFAULT_PHONE_COUNTRY_CODE}${digits.slice(1)}`;
  } else if (!digits.startsWith(DEFAULT_PHONE_COUNTRY_CODE)) {
    digits = `${DEFAULT_PHONE_COUNTRY_CODE}${digits}`;
  }

  return `+${digits}`;
}

/** Internal Supabase auth email for accounts created without a contact email. */
export function buildPhoneAuthEmail(normalizedPhone: string): string {
  const digits = normalizedPhone.replace(/\D/g, "");
  return `phone+${digits}@${PHONE_AUTH_EMAIL_DOMAIN}`;
}

export function isSyntheticPhoneAuthEmail(email: string): boolean {
  return new RegExp(`^phone\\+\\d+@${PHONE_AUTH_EMAIL_DOMAIN.replace(".", "\\.")}$`, "i").test(
    email.trim().toLowerCase()
  );
}

export function hasRecoverableEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.endsWith("@users.local")) return false;
  return !isSyntheticPhoneAuthEmail(normalized);
}

export function getRecoveryEmailDisplay(profileEmail: string | null | undefined): string {
  if (!profileEmail || !hasRecoverableEmail(profileEmail)) {
    return "";
  }
  return profileEmail.trim().toLowerCase();
}

export function canEditRecoveryEmail(params: {
  authEmail: string | null | undefined;
  profilePhone: string | null | undefined;
  userMetadata?: Record<string, unknown> | undefined;
}): boolean {
  void params.profilePhone;
  return isPhoneSignupAccount({
    authEmail: params.authEmail,
    userMetadata: params.userMetadata,
  });
}

export type SignupIdentifier =
  | { type: "email"; email: string }
  | { type: "phone"; phone: string };

/** Parse a signup identifier — must be a valid email or phone, not both. */
export function parseSignupIdentifier(raw: string): SignupIdentifier {
  const trimmed = sanitizeTextInput(raw);
  if (!trimmed) {
    throw new Error("Phone number or email is required");
  }

  if (isEmailIdentifier(trimmed)) {
    return { type: "email", email: trimmed.toLowerCase() };
  }

  if (!isValidPhoneInput(trimmed)) {
    throw new Error("Enter a valid phone number or email address");
  }

  return { type: "phone", phone: normalizePhoneNumber(trimmed) };
}
