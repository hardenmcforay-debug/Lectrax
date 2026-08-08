/**
 * Transport-layer security helpers for HTTPS enforcement across Lectrax.
 */

/** Local development origin — never used in production. */
export const DEV_HTTP_ORIGIN = "http://localhost:3000";

/** Local admin app development origin. */
export const DEV_ADMIN_HTTP_ORIGIN = "http://localhost:3001";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname.toLowerCase());
}

/** Environment variables that must use HTTPS in production when set. */
export const HTTPS_REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_ADMIN_APP_URL",
  "NEXT_PUBLIC_MAIN_APP_URL",
] as const;

export type HttpsEnvVar = (typeof HTTPS_REQUIRED_ENV_VARS)[number];

/**
 * Returns an error message when a URL is not HTTPS-safe for production, or null if valid.
 * Unset optional variables are skipped.
 */
export function validateHttpsUrl(
  name: string,
  value: string | undefined,
  options?: { required?: boolean }
): string | null {
  const required = options?.required ?? false;
  if (!value?.trim()) {
    return required ? `Missing ${name}` : null;
  }

  if (!isProduction()) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return `${name} is not a valid URL`;
  }

  if (parsed.protocol !== "https:") {
    return `${name} must use HTTPS in production (got ${parsed.protocol}//)`;
  }

  if (isLocalHostname(parsed.hostname)) {
    return `${name} must not use localhost in production`;
  }

  return null;
}

/** Normalize a configured origin; upgrades accidental http→https in production. */
export function normalizeSecureOrigin(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  if (!isProduction()) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" && !isLocalHostname(parsed.hostname)) {
      parsed.protocol = "https:";
      return parsed.origin;
    }
    return parsed.origin;
  } catch {
    return trimmed;
  }
}

export {
  getSecurityHeaders,
  getContentSecurityPolicy,
  getPermissionsPolicy,
} from "@/lib/security/headers";

/**
 * Block insecure absolute HTTP requests from the browser in production.
 * Relative URLs and localhost HTTP are allowed.
 */
export function assertSecureClientRequest(input: RequestInfo | URL): void {
  if (!isProduction() || typeof window === "undefined") {
    return;
  }

  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input instanceof Request
          ? input.url
          : String(input);

  if (!/^https?:\/\//i.test(raw)) {
    return;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" && !isLocalHostname(parsed.hostname)) {
      throw new Error(`Insecure HTTP request blocked: ${parsed.origin}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Insecure HTTP")) {
      throw error;
    }
  }
}
