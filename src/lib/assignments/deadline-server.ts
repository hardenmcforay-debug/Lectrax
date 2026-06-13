import type { SupabaseClient } from "@supabase/supabase-js";
import { isPastDeadline } from "@/lib/assignments/deadline";
import { createServiceClient } from "@/lib/supabase/server";

function parseRpcBoolean(value: unknown): boolean | null {
  if (value === true || value === false) return value;
  if (value === "t" || value === "true") return true;
  if (value === "f" || value === "false") return false;
  return null;
}

function parseRpcJson(data: unknown): Record<string, unknown> | null {
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }

  return null;
}

function coerceTimestamp(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

async function getServiceSupabase(): Promise<SupabaseClient> {
  return createServiceClient();
}

async function resolveDeadline(
  supabase: SupabaseClient,
  assignmentId: string,
  fallbackDeadline?: string
): Promise<string | null> {
  if (fallbackDeadline) return fallbackDeadline;

  const { data: assignment } = await supabase
    .from("assignments")
    .select("deadline")
    .eq("id", assignmentId)
    .maybeSingle();

  return coerceTimestamp(assignment?.deadline);
}

export type AssignmentDeadlineStatus = {
  serverTime: string;
  deadline: string;
  beforeDeadline: boolean;
};

async function readDeadlineStatusFromRpc(
  supabase: SupabaseClient,
  assignmentId: string,
  fallbackDeadline?: string
): Promise<AssignmentDeadlineStatus | null> {
  const { data, error } = await supabase.rpc("get_assignment_deadline_status", {
    p_assignment_id: assignmentId,
  });

  if (error) return null;

  const row = parseRpcJson(data);
  if (!row) return null;

  const serverTime = coerceTimestamp(row.server_time);
  const deadline = coerceTimestamp(row.deadline) ?? fallbackDeadline ?? null;
  const beforeDeadline = parseRpcBoolean(row.before_deadline);

  if (!serverTime || !deadline || beforeDeadline === null) {
    return null;
  }

  return { serverTime, deadline, beforeDeadline };
}

async function readBeforeDeadlineFromRpc(
  supabase: SupabaseClient,
  assignmentId: string
): Promise<boolean | null> {
  const { data, error } = await supabase.rpc("is_assignment_before_deadline", {
    p_assignment_id: assignmentId,
  });

  if (error) return null;
  return parseRpcBoolean(data);
}

/** Authoritative deadline check using database server time. Fails closed when verification fails. */
export async function isAssignmentBeforeDeadline(
  _supabase: SupabaseClient | null | undefined,
  assignmentId: string,
  fallbackDeadline?: string
): Promise<boolean> {
  const service = await getServiceSupabase();

  const rpcBeforeDeadline = await readBeforeDeadlineFromRpc(service, assignmentId);
  if (rpcBeforeDeadline !== null) {
    return rpcBeforeDeadline;
  }

  const status = await readDeadlineStatusFromRpc(service, assignmentId, fallbackDeadline);
  if (status) {
    return status.beforeDeadline;
  }

  const deadline =
    coerceTimestamp(fallbackDeadline) ??
    (await resolveDeadline(service, assignmentId, fallbackDeadline));

  if (!deadline) return false;

  return !isPastDeadline(deadline);
}

/** Fetch deadline status from the database server clock (authoritative). */
export async function getAssignmentDeadlineStatus(
  _supabase: SupabaseClient | null | undefined,
  assignmentId: string,
  fallbackDeadline?: string
): Promise<AssignmentDeadlineStatus | null> {
  const service = await getServiceSupabase();

  const status = await readDeadlineStatusFromRpc(service, assignmentId, fallbackDeadline);
  if (status) return status;

  const beforeDeadline = await readBeforeDeadlineFromRpc(service, assignmentId);
  if (beforeDeadline === null) {
    console.error("Assignment deadline status RPC failed for assignment", assignmentId);
    return null;
  }

  const deadline =
    coerceTimestamp(fallbackDeadline) ??
    (await resolveDeadline(service, assignmentId, fallbackDeadline));

  if (!deadline) return null;

  const { data: serverTime } = await service.rpc("get_server_time");
  const resolvedServerTime = coerceTimestamp(serverTime) ?? new Date().toISOString();

  return {
    serverTime: resolvedServerTime,
    deadline,
    beforeDeadline,
  };
}
