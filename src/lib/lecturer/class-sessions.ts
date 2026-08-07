import { createClient } from "@/lib/supabase/server";
import { CLASS_SESSION_COLUMNS } from "@/lib/lecturer/class-session-columns";
import {
  PAGINATION,
  toRangeBounds,
  type OffsetPaginationInput,
} from "@/lib/pagination";
import type { ClassSession } from "@/types/database";

/** Load a lecturer-owned class session (server-only, via RLS). */
export async function getClassSessionForLecturer(
  sessionId: string,
  lecturerId: string
): Promise<ClassSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_sessions")
    .select(CLASS_SESSION_COLUMNS)
    .eq("id", sessionId)
    .eq("lecturer_id", lecturerId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ClassSession;
}

/** List class sessions for a lecturer with offset pagination (server-only, via RLS). */
export async function getLecturerClassSessions(
  lecturerId: string,
  pagination: OffsetPaginationInput = {
    page: PAGINATION.DEFAULT_PAGE,
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
  }
): Promise<{ sessions: ClassSession[]; total: number }> {
  const supabase = await createClient();
  const pageSize = Math.min(pagination.pageSize, PAGINATION.MAX_PAGE_SIZE);
  const { from, to } = toRangeBounds(pagination.page, pageSize);

  const { data, error, count } = await supabase
    .from("class_sessions")
    .select(CLASS_SESSION_COLUMNS, { count: "exact" })
    .eq("lecturer_id", lecturerId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error || !data) return { sessions: [], total: 0 };
  return { sessions: data as ClassSession[], total: count ?? 0 };
}
