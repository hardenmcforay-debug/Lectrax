import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAttendanceSessionOpen } from "@/lib/attendance/constants";
import { closeAttendanceSessionIfAbandoned } from "@/lib/attendance/close-session";
import type { AttendanceSession } from "@/types/database";

export async function getAttendanceSessionForLecturer(
  attendanceSessionId: string,
  lecturerId: string,
  client?: SupabaseClient
): Promise<AttendanceSession | null> {
  const supabase = client ?? (await createClient());
  const { data } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("id", attendanceSessionId)
    .eq("lecturer_id", lecturerId)
    .maybeSingle();

  return (data as AttendanceSession | null) ?? null;
}

export async function getActiveAttendanceSession(
  classSessionId: string,
  lecturerId: string,
  client?: SupabaseClient
): Promise<AttendanceSession | null> {
  const supabase = client ?? (await createClient());
  const { data } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("class_session_id", classSessionId)
    .eq("lecturer_id", lecturerId)
    .eq("is_active", true)
    .is("ended_at", null)
    .gt("session_expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const session = (data as AttendanceSession | null) ?? null;
  if (!session) return null;

  const closed = await closeAttendanceSessionIfAbandoned(supabase, session);
  if (closed || !isAttendanceSessionOpen(session)) return null;

  return session;
}

export async function countPresentStudents(
  attendanceSessionId: string,
  client?: SupabaseClient
): Promise<number> {
  const supabase = client ?? (await createClient());
  const { count } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("attendance_session_id", attendanceSessionId);

  return count ?? 0;
}

/** O(1) count query — avoids loading every session id for the class. */
export async function getAttendanceSessionNumber(
  classSessionId: string,
  sessionCreatedAt: string,
  client?: SupabaseClient
): Promise<number> {
  const supabase = client ?? (await createClient());
  const { count } = await supabase
    .from("attendance_sessions")
    .select("*", { count: "exact", head: true })
    .eq("class_session_id", classSessionId)
    .lte("created_at", sessionCreatedAt);

  return count ?? 1;
}
