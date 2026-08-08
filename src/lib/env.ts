import "server-only";

/**
 * Centralized environment variable validation for production deployments.
 * Fails fast with clear messages when required configuration is missing.
 */

const PLACEHOLDER_PATTERNS = [
  /^your-/i,
  /^change-this/i,
  /^replace-me/i,
  /^example/i,
  /^xxx/i,
  /^\.{2,}$/,
];

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value.trim()));
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function assertEnv(name: string, options?: { minLength?: number }): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (isPlaceholder(value)) {
    throw new Error(`Environment variable ${name} is still set to a placeholder value`);
  }
  if (options?.minLength && value.length < options.minLength) {
    throw new Error(
      `Environment variable ${name} must be at least ${options.minLength} characters`
    );
  }
  return value;
}

/** Public variables required for client and server Supabase access. */
export function getPublicSupabaseEnv(): { url: string; anonKey: string } {
  return {
    url: assertEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: assertEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

/** Server-only service role key for privileged operations. */
export function getServiceRoleKey(): string {
  return assertEnv("SUPABASE_SERVICE_ROLE_KEY");
}

/** Whether the service role key is configured (does not expose the value). */
export function isServiceRoleConfigured(): boolean {
  return !!readEnv("SUPABASE_SERVICE_ROLE_KEY");
}

/** Application base URL for redirects, webhooks, and email links. */
export function getAppUrl(fallbackOrigin?: string): string {
  const configured = readEnv("NEXT_PUBLIC_APP_URL");
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (fallbackOrigin) {
    return fallbackOrigin.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing NEXT_PUBLIC_APP_URL. Set it to your production domain (e.g. https://lectrax.app)."
    );
  }
  return "http://localhost:3000";
}

/** QR attendance token signing secret. */
export function getQrTokenSecret(): string {
  return assertEnv("QR_TOKEN_SECRET", { minLength: 32 });
}

/** Cron job authorization secret. */
export function getCronSecret(): string | undefined {
  return readEnv("CRON_SECRET");
}

/** Optional VirusTotal API key for assignment PDF antivirus scanning. */
export function getVirusTotalApiKey(): string | undefined {
  const value = readEnv("VIRUSTOTAL_API_KEY");
  if (!value || isPlaceholder(value)) return undefined;
  return value;
}

/** When true, assignment uploads fail if antivirus scanning is not configured. */
export function isAntivirusScanRequired(): boolean {
  return readEnv("SUBMISSION_ANTIVIRUS_REQUIRED") === "true";
}

/** Monime payment configuration (optional until payments are enabled). */
export function getMonimeEnv(): {
  apiKey: string;
  spaceId: string;
  webhookSecret: string;
  currency: string;
} | null {
  const apiKey = readEnv("MONIME_API_KEY");
  const spaceId = readEnv("MONIME_SPACE_ID");
  const webhookSecret = readEnv("MONIME_WEBHOOK_SECRET");

  if (!apiKey && !spaceId && !webhookSecret) {
    return null;
  }

  if (!apiKey || !spaceId || !webhookSecret) {
    throw new Error(
      "Monime payment configuration is incomplete. Set MONIME_API_KEY, MONIME_SPACE_ID, and MONIME_WEBHOOK_SECRET together."
    );
  }

  if (isPlaceholder(apiKey) || isPlaceholder(webhookSecret)) {
    throw new Error("Monime environment variables contain placeholder values");
  }

  return {
    apiKey,
    spaceId,
    webhookSecret,
    currency: readEnv("MONIME_CURRENCY") ?? "SLE",
  };
}

export type EnvValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

function isAdminDeploymentEnv(): boolean {
  return process.env.NEXT_PUBLIC_DEPLOYMENT_TARGET?.trim() === "admin";
}

/** Validate all required production environment variables at startup. */
export function validateProductionEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const adminDeployment = isAdminDeploymentEnv();

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_APP_URL",
    ...(adminDeployment ? [] : (["QR_TOKEN_SECRET"] as const)),
  ] as const;

  for (const name of required) {
    const value = readEnv(name);
    if (!value) {
      errors.push(`Missing ${name}`);
      continue;
    }
    if (isPlaceholder(value)) {
      errors.push(`${name} is still a placeholder`);
    }
  }

  if (!adminDeployment) {
    const qrSecret = readEnv("QR_TOKEN_SECRET");
    if (qrSecret && qrSecret.length < 32) {
      errors.push("QR_TOKEN_SECRET must be at least 32 characters");
    }
  }

  if (adminDeployment) {
    if (!readEnv("NEXT_PUBLIC_MAIN_APP_URL")) {
      warnings.push(
        "NEXT_PUBLIC_MAIN_APP_URL not set — non-admin users will not be redirected to the main app"
      );
    }
  } else {
    if (!readEnv("CRON_SECRET")) {
      warnings.push(
        "CRON_SECRET not set — the daily subscription lifecycle cron will return 401 until configured"
      );
    } else if (isPlaceholder(readEnv("CRON_SECRET")!)) {
      warnings.push("CRON_SECRET is still a placeholder");
    }

    if (isAntivirusScanRequired() && !getVirusTotalApiKey()) {
      errors.push(
        "SUBMISSION_ANTIVIRUS_REQUIRED is true but VIRUSTOTAL_API_KEY is not configured"
      );
    } else if (!getVirusTotalApiKey()) {
      warnings.push(
        "VIRUSTOTAL_API_KEY not set — assignment uploads use deep PDF inspection only (no antivirus)"
      );
    }

    try {
      getMonimeEnv();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        readEnv("MONIME_API_KEY") ||
        readEnv("MONIME_SPACE_ID") ||
        readEnv("MONIME_WEBHOOK_SECRET")
      ) {
        warnings.push(`Monime payment configuration issue: ${message}`);
      } else {
        warnings.push("Monime payments not configured (optional until checkout is enabled)");
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
