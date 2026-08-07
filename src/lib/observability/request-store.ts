/**
 * Per-request observability identity (userId / tenant).
 * Bound by auth helpers or JWT peek — avoids an extra getUser() in the wrapper.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { TENANT_HEADER } from "@/lib/observability/constants";

export type ObservabilityIdentity = {
  userId: string | null;
  tenant: string | null;
};

const store = new AsyncLocalStorage<ObservabilityIdentity>();

export function runWithObservabilityStore<T>(
  identity: ObservabilityIdentity,
  fn: () => T
): T {
  return store.run(identity, fn);
}

export function getObservabilityIdentity(): ObservabilityIdentity {
  return store.getStore() ?? { userId: null, tenant: null };
}

/** Bind authenticated user for the current API request (no-op outside wrapped handlers). */
export function bindObservabilityUser(userId: string | null | undefined): void {
  const current = store.getStore();
  if (!current || !userId) return;
  current.userId = userId;
}

/** Future multi-tenant: bind campus/org id for structured logs. */
export function bindObservabilityTenant(tenant: string | null | undefined): void {
  const current = store.getStore();
  if (!current || !tenant) return;
  current.tenant = tenant;
}

export function readTenantFromRequest(request: Request): string | null {
  const header = request.headers.get(TENANT_HEADER)?.trim();
  return header || null;
}

/**
 * Best-effort user id from Supabase auth cookie JWT payload (no signature verify).
 * Used only for telemetry when auth helpers have not bound a user yet.
 */
export function peekUserIdFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const authCookies = cookies.filter((part) => {
    const name = part.split("=")[0] ?? "";
    return name.includes("-auth-token") || (name.startsWith("sb-") && name.includes("auth"));
  });

  if (authCookies.length === 0) return null;

  // Reassemble chunked cookies (name.0, name.1, …) into a single value.
  const byBase = new Map<string, Array<{ index: number; value: string }>>();
  for (const part of authCookies) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const rawName = part.slice(0, eq);
    const value = decodeURIComponent(part.slice(eq + 1));
    const chunkMatch = rawName.match(/^(.*)\.(\d+)$/);
    const base = chunkMatch?.[1] ?? rawName;
    const index = chunkMatch ? Number(chunkMatch[2]) : 0;
    const list = byBase.get(base) ?? [];
    list.push({ index, value });
    byBase.set(base, list);
  }

  for (const chunks of byBase.values()) {
    const assembled = chunks
      .sort((a, b) => a.index - b.index)
      .map((c) => c.value)
      .join("");
    const userId = extractSubFromAuthCookieValue(assembled);
    if (userId) return userId;
  }

  return null;
}

function extractSubFromAuthCookieValue(raw: string): string | null {
  const candidates: string[] = [raw];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string") {
      candidates.push(parsed);
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.access_token === "string") candidates.push(obj.access_token);
      if (Array.isArray(parsed) && typeof parsed[0] === "string") {
        candidates.push(parsed[0]);
      }
    }
  } catch {
    // Not JSON — may already be a JWT or base64 session blob.
  }

  for (const candidate of candidates) {
    const sub = decodeJwtSub(candidate);
    if (sub) return sub;
  }

  return null;
}

function decodeJwtSub(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    const data = JSON.parse(json) as { sub?: unknown };
    return typeof data.sub === "string" && data.sub.length > 0 ? data.sub : null;
  } catch {
    return null;
  }
}
