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

const DEFAULT_VALIDATION_MESSAGE = "Please check your input and try again.";

function isRawZodMessage(message: string): boolean {
  return (
    /^Invalid input:/i.test(message) ||
    /^Invalid type:/i.test(message) ||
    /^Expected [a-z]/i.test(message) ||
    /nonoptional/i.test(message) ||
    /^Required$/i.test(message) ||
    /received (undefined|null|nan)/i.test(message)
  );
}

function humanizeFieldName(path: PropertyKey | undefined): string | null {
  if (typeof path !== "string" || path.length === 0) return null;
  const spaced = path
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return spaced.length > 0 ? spaced : null;
}

/**
 * Convert Zod issues into production-ready copy.
 * Never surface raw schema internals like "expected nonoptional".
 */
export function userFacingZodMessage(
  error: z.ZodError | { issues?: Array<{ message?: string; path?: PropertyKey[] }> } | null | undefined,
  fallback: string = DEFAULT_VALIDATION_MESSAGE
): string {
  const issue = error?.issues?.[0];
  const message = issue?.message?.trim();
  if (!message) return fallback;

  if (!isRawZodMessage(message)) {
    return message;
  }

  const field = humanizeFieldName(issue?.path?.[0]);
  if (field) {
    return `Please provide a valid ${field}.`;
  }

  return fallback;
}

export function sanitizedRequiredString(options: {
  min: number;
  max: number;
  minMessage?: string;
  maxMessage?: string;
}) {
  const requiredMessage = options.minMessage ?? "This field is required";
  return z
    .string({ error: requiredMessage })
    .transform((value) => sanitizeTextInput(value))
    .pipe(
      z
        .string()
        .min(options.min, { error: requiredMessage })
        .max(options.max, {
          error: options.maxMessage ?? `Must be at most ${options.max} characters`,
        })
    );
}

export function optionalSanitizedString(max: number) {
  return z
    .union([z.string(), z.undefined()])
    .transform((value) => sanitizeOptionalText(value ?? ""))
    .pipe(
      z.union([
        z.undefined(),
        z.string().max(max, { error: `Must be at most ${max} characters` }),
      ])
    )
    .optional();
}

export const emailField = z
  .string({ error: "Email is required" })
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
  )
  .optional();

export const passwordField = (minLength: number, minMessage: string) =>
  z
    .string({ error: minMessage })
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
  )
  .optional();

export const requiredPhoneField = z
  .string({ error: "Phone number is required" })
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
  .string({ error: "Session code is required" })
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
