/** Strip HTML tags from user-controlled text. */
const HTML_TAG_REGEX = /<[^>]*>/g;

/** Neutralize common inline script / event-handler patterns. */
const SCRIPT_PROTOCOL_REGEX = /javascript\s*:/gi;
const EVENT_HANDLER_REGEX = /\bon\w+\s*=/gi;

/** Remove null bytes (can bypass filters or truncate strings in some systems). */
function stripNullBytes(value: string): string {
  return value.replace(/\0/g, "");
}

export function stripHtml(value: string): string {
  return value.replace(HTML_TAG_REGEX, "");
}

/**
 * Sanitize free-text input before validation or API submission.
 * Strips HTML, null bytes, and common XSS patterns; trims whitespace.
 */
export function sanitizeTextInput(value: string): string {
  return stripNullBytes(stripHtml(value))
    .replace(SCRIPT_PROTOCOL_REGEX, "")
    .replace(EVENT_HANDLER_REGEX, "")
    .trim();
}

/** Sanitize optional text; empty strings become undefined. */
export function sanitizeOptionalText(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  const sanitized = sanitizeTextInput(value);
  return sanitized.length === 0 ? undefined : sanitized;
}

/** Sanitize admin/client search box input. */
export function sanitizeSearchQuery(value: string): string {
  return sanitizeTextInput(value).slice(0, 200);
}

/** Normalize session join codes: uppercase alphanumeric only. */
export function sanitizeSessionCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

/** Keep digits and common phone formatting characters. */
export function sanitizePhoneInput(value: string): string {
  return stripNullBytes(stripHtml(value))
    .replace(/[^\d+\-() ]/g, "")
    .trim();
}

/** Sanitize uploaded file names — remove path separators and traversal. */
export function sanitizeFilename(filename: string): string {
  const base = filename
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\.\./g, "_")
    .replace(/^\./, "_");
  return base.slice(0, 255);
}

/** Sanitize URL query parameter values read on the client. */
export function sanitizeQueryParam(
  value: string | null | undefined,
  maxLen = 100
): string {
  if (!value) return "";
  return sanitizeTextInput(value).slice(0, maxLen);
}

/** Allowed values for known payment callback query flags. */
export function isAllowedPaymentCallbackFlag(value: string | null | undefined): boolean {
  if (!value) return false;
  const sanitized = sanitizeQueryParam(value, 20);
  return sanitized === "1" || sanitized === "true";
}
