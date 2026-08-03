import { z } from "zod";
import {
  isValidPhoneInput,
  normalizePhoneNumber,
} from "@/lib/auth/phone-number";
import {
  sanitizeOptionalText,
  sanitizePhoneInput,
  sanitizeSessionCode,
  sanitizeTextInput,
} from "@/lib/security/sanitize";

export const FIELD_LIMITS = {
  FULL_NAME: 120,
  EMAIL: 254,
  PASSWORD: 128,
  PHONE: 30,
  COLLEGE_ID: 50,
  SUBJECT: 200,
  MESSAGE: 5000,
  DESCRIPTION: 10000,
  TITLE: 200,
  COURSE_CODE: 30,
  CLASS_NAME: 120,
  ACADEMIC_YEAR: 20,
  UNIVERSITY_NAME: 200,
  DEPARTMENT_NAME: 120,
  POSITION_ROLE: 80,
  NOTES: 5000,
  SEARCH: 200,
  SESSION_CODE: 10,
} as const;

export function sanitizedRequiredString(options: {
  min: number;
  max: number;
  minMessage?: string;
  maxMessage?: string;
}) {
  return z
    .string()
    .transform((value) => sanitizeTextInput(value))
    .pipe(
      z
        .string()
        .min(options.min, { error: options.minMessage ?? "This field is required" })
        .max(options.max, {
          error: options.maxMessage ?? `Must be at most ${options.max} characters`,
        })
    );
}

export function optionalSanitizedString(max: number) {
  return z
    .union([z.string(), z.undefined()])
    .transform((value) => sanitizeOptionalText(value ?? ""))
    .pipe(z.union([z.undefined(), z.string().max(max)]));
}

export const emailField = z
  .string()
  .transform((value) => sanitizeTextInput(value).toLowerCase())
  .pipe(
    z
      .email({ error: "Invalid email address" })
      .max(FIELD_LIMITS.EMAIL, { error: "Email is too long" })
  );

export const optionalEmailField = z
  .union([z.string(), z.undefined()])
  .transform((value) => {
    const sanitized = sanitizeOptionalText(value ?? "");
    if (!sanitized) return undefined;
    return sanitized.toLowerCase();
  })
  .pipe(
    z.union([
      z.undefined(),
      z
        .email({ error: "Invalid email address" })
        .max(FIELD_LIMITS.EMAIL, { error: "Email is too long" }),
    ])
  );

export const passwordField = (minLength: number, minMessage: string) =>
  z
    .string()
    .min(minLength, { error: minMessage })
    .max(FIELD_LIMITS.PASSWORD, { error: "Password is too long" });

export const optionalPhoneField = z
  .union([z.string(), z.undefined()])
  .transform((value) => {
    if (!value || value.trim() === "") return undefined;
    return sanitizePhoneInput(value);
  })
  .pipe(
    z.union([
      z.undefined(),
      z
        .string()
        .min(6, { error: "Phone number is too short" })
        .max(FIELD_LIMITS.PHONE, { error: "Phone number is too long" })
        .regex(/^[\d+\-() ]+$/, { error: "Invalid phone number format" }),
    ])
  );

export const requiredPhoneField = z
  .string()
  .transform((value) => sanitizePhoneInput(value))
  .pipe(
    z
      .string()
      .min(6, { error: "Phone number is required" })
      .max(FIELD_LIMITS.PHONE, { error: "Phone number is too long" })
      .regex(/^[\d+\-() ]+$/, { error: "Invalid phone number format" })
  );

export const normalizedRequiredPhoneField = requiredPhoneField.transform((value, ctx) => {
  if (!isValidPhoneInput(value)) {
    ctx.addIssue({
      code: "custom",
      message: "Invalid phone number format",
    });
    return z.NEVER;
  }

  try {
    return normalizePhoneNumber(value);
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "Invalid phone number format",
    });
    return z.NEVER;
  }
});

export const sessionCodeField = z
  .string()
  .transform((value) => sanitizeSessionCode(value))
  .pipe(
    z
      .string()
      .min(4, { error: "Session code must be at least 4 characters" })
      .max(FIELD_LIMITS.SESSION_CODE, { error: "Session code is too long" })
      .regex(/^[A-Z0-9]+$/, {
        error: "Session code may only contain letters and numbers",
      })
  );

/** RFC 9562/4122 UUID (Supabase IDs). */
export function uuidField(errorMessage = "Invalid ID") {
  return z.uuid({ error: errorMessage });
}
