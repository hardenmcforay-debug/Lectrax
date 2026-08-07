/**
 * Dependency health probes for /api/live, /api/ready, /api/health.
 */

import { createClient } from "@supabase/supabase-js";
import {
  LATENCY,
  MEMORY_RSS_WARN_BYTES,
} from "@/lib/observability/constants";

export type ProbeStatus = "pass" | "warn" | "fail";

export type ProbeResult = {
  name: string;
  status: ProbeStatus;
  latencyMs: number;
  detail?: string;
};

export type HealthReport = {
  status: ProbeStatus;
  checkedAt: string;
  version: string;
  uptimeSeconds: number | null;
  memory: {
    rssBytes: number;
    heapUsedBytes: number;
    warn: boolean;
  } | null;
  probes: ProbeResult[];
  totalLatencyMs: number;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function isPlaceholder(value: string): boolean {
  return /^(your-|change-this|replace-me|example|xxx)/i.test(value.trim());
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function classifyLatency(latencyMs: number): ProbeStatus {
  if (latencyMs >= LATENCY.HEALTH_PROBE_FAIL_MS) return "fail";
  if (latencyMs >= LATENCY.HEALTH_PROBE_WARN_MS) return "warn";
  return "pass";
}

function worstStatus(statuses: ProbeStatus[]): ProbeStatus {
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("warn")) return "warn";
  return "pass";
}

export function checkEnvironmentConfig(): ProbeResult {
  const started = Date.now();
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_APP_URL",
  ];
  const missing: string[] = [];
  const placeholders: string[] = [];

  for (const name of required) {
    const value = readEnv(name);
    if (!value) missing.push(name);
    else if (isPlaceholder(value)) placeholders.push(name);
  }

  const latencyMs = Date.now() - started;
  if (missing.length || placeholders.length) {
    return {
      name: "environment",
      status: "fail",
      latencyMs,
      detail: [
        missing.length ? `missing:${missing.join(",")}` : null,
        placeholders.length ? `placeholder:${placeholders.join(",")}` : null,
      ]
        .filter(Boolean)
        .join("; "),
    };
  }

  const optionalWarnings: string[] = [];
  if (!readEnv("SENTRY_DSN") && !readEnv("NEXT_PUBLIC_SENTRY_DSN")) {
    optionalWarnings.push("sentry_unconfigured");
  }
  if (!readEnv("CRON_SECRET")) optionalWarnings.push("cron_secret_unconfigured");

  return {
    name: "environment",
    status: optionalWarnings.length ? "warn" : "pass",
    latencyMs,
    detail: optionalWarnings.length ? optionalWarnings.join(",") : "ok",
  };
}

export async function checkDatabase(): Promise<ProbeResult> {
  const started = Date.now();
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return {
      name: "database",
      status: "fail",
      latencyMs: Date.now() - started,
      detail: "supabase_credentials_missing",
    };
  }

  try {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await withTimeout(
      Promise.resolve(
        client.from("profiles").select("id", { count: "exact", head: true }).limit(1)
      ),
      LATENCY.DB_CHECK_TIMEOUT_MS,
      "database"
    );
    const latencyMs = Date.now() - started;
    if (error) {
      return {
        name: "database",
        status: "fail",
        latencyMs,
        detail: error.message,
      };
    }
    return {
      name: "database",
      status: classifyLatency(latencyMs),
      latencyMs,
      detail: "ok",
    };
  } catch (error) {
    return {
      name: "database",
      status: "fail",
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : "database_check_failed",
    };
  }
}

export async function checkSupabaseAuth(): Promise<ProbeResult> {
  const started = Date.now();
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anon) {
    return {
      name: "supabase_auth",
      status: "fail",
      latencyMs: Date.now() - started,
      detail: "anon_credentials_missing",
    };
  }

  try {
    const response = await withTimeout(
      fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
        method: "GET",
        headers: { apikey: anon },
        cache: "no-store",
      }),
      LATENCY.EXTERNAL_CHECK_TIMEOUT_MS,
      "supabase_auth"
    );
    const latencyMs = Date.now() - started;
    if (!response.ok) {
      return {
        name: "supabase_auth",
        status: "fail",
        latencyMs,
        detail: `http_${response.status}`,
      };
    }
    return {
      name: "supabase_auth",
      status: classifyLatency(latencyMs),
      latencyMs,
      detail: "ok",
    };
  } catch (error) {
    return {
      name: "supabase_auth",
      status: "fail",
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : "auth_health_failed",
    };
  }
}

export async function checkStorage(): Promise<ProbeResult> {
  const started = Date.now();
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return {
      name: "storage",
      status: "fail",
      latencyMs: Date.now() - started,
      detail: "supabase_credentials_missing",
    };
  }

  try {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await withTimeout(
      Promise.resolve(client.storage.listBuckets()),
      LATENCY.STORAGE_CHECK_TIMEOUT_MS,
      "storage"
    );
    const latencyMs = Date.now() - started;
    if (error) {
      return {
        name: "storage",
        status: "fail",
        latencyMs,
        detail: error.message,
      };
    }
    return {
      name: "storage",
      status: classifyLatency(latencyMs),
      latencyMs,
      detail: `buckets:${data?.length ?? 0}`,
    };
  } catch (error) {
    return {
      name: "storage",
      status: "fail",
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : "storage_check_failed",
    };
  }
}

export async function checkMonime(): Promise<ProbeResult> {
  const started = Date.now();
  const apiKey = readEnv("MONIME_API_KEY");
  const spaceId = readEnv("MONIME_SPACE_ID");
  if (!apiKey && !spaceId) {
    return {
      name: "monime",
      status: "warn",
      latencyMs: Date.now() - started,
      detail: "not_configured",
    };
  }
  if (!apiKey || !spaceId || isPlaceholder(apiKey)) {
    return {
      name: "monime",
      status: "fail",
      latencyMs: Date.now() - started,
      detail: "incomplete_configuration",
    };
  }
  return {
    name: "monime",
    status: "pass",
    latencyMs: Date.now() - started,
    detail: "configured",
  };
}

export async function checkResend(): Promise<ProbeResult> {
  const started = Date.now();
  const apiKey = readEnv("RESEND_API_KEY");
  if (!apiKey) {
    return {
      name: "resend",
      status: "warn",
      latencyMs: Date.now() - started,
      detail: "not_configured_supabase_auth_email",
    };
  }
  if (isPlaceholder(apiKey)) {
    return {
      name: "resend",
      status: "fail",
      latencyMs: Date.now() - started,
      detail: "placeholder",
    };
  }
  return {
    name: "resend",
    status: "pass",
    latencyMs: Date.now() - started,
    detail: "configured",
  };
}

function readMemory(): HealthReport["memory"] {
  if (typeof process === "undefined" || typeof process.memoryUsage !== "function") {
    return null;
  }
  const usage = process.memoryUsage();
  return {
    rssBytes: usage.rss,
    heapUsedBytes: usage.heapUsed,
    warn: usage.rss >= MEMORY_RSS_WARN_BYTES,
  };
}

function readUptimeSeconds(): number | null {
  if (typeof process === "undefined" || typeof process.uptime !== "function") return null;
  return Math.round(process.uptime());
}

/** Process is up — no dependency checks (Kubernetes-style liveness). */
export function buildLiveReport(): HealthReport {
  const started = Date.now();
  const memory = readMemory();
  const probes: ProbeResult[] = [
    {
      name: "process",
      status: memory?.warn ? "warn" : "pass",
      latencyMs: Date.now() - started,
      detail: "alive",
    },
  ];
  return {
    status: worstStatus(probes.map((p) => p.status)),
    checkedAt: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.npm_package_version ?? "0.1.0",
    uptimeSeconds: readUptimeSeconds(),
    memory,
    probes,
    totalLatencyMs: Date.now() - started,
  };
}

/** Ready to receive traffic — critical dependencies must pass. */
export async function buildReadyReport(): Promise<HealthReport> {
  const started = Date.now();
  const probes = await Promise.all([
    Promise.resolve(checkEnvironmentConfig()),
    checkDatabase(),
    checkSupabaseAuth(),
  ]);
  const memory = readMemory();
  if (memory?.warn) {
    probes.push({
      name: "memory",
      status: "warn",
      latencyMs: 0,
      detail: `rss:${memory.rssBytes}`,
    });
  }
  return {
    status: worstStatus(probes.map((p) => p.status)),
    checkedAt: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.npm_package_version ?? "0.1.0",
    uptimeSeconds: readUptimeSeconds(),
    memory,
    probes,
    totalLatencyMs: Date.now() - started,
  };
}

/** Full health — DB, Supabase, storage, env, external services, latency. */
export async function buildHealthReport(): Promise<HealthReport> {
  const started = Date.now();
  const probes = await Promise.all([
    Promise.resolve(checkEnvironmentConfig()),
    checkDatabase(),
    checkSupabaseAuth(),
    checkStorage(),
    checkMonime(),
    checkResend(),
  ]);
  const memory = readMemory();
  if (memory?.warn) {
    probes.push({
      name: "memory",
      status: "warn",
      latencyMs: 0,
      detail: `rss:${memory.rssBytes}`,
    });
  }
  return {
    status: worstStatus(probes.map((p) => p.status)),
    checkedAt: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.npm_package_version ?? "0.1.0",
    uptimeSeconds: readUptimeSeconds(),
    memory,
    probes,
    totalLatencyMs: Date.now() - started,
  };
}

export function healthHttpStatus(status: ProbeStatus, mode: "live" | "ready" | "health"): number {
  if (status === "fail") return mode === "live" ? 503 : 503;
  if (status === "warn" && mode === "ready") return 200;
  return 200;
}
