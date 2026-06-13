import { createServiceClient } from "@/lib/supabase/server";
import { isAttendanceSessionOpen } from "@/lib/attendance/constants";
import type { AttendanceSession } from "@/types/database";

export async function getAttendanceSessionForLecturer(
  attendanceSessionId: string,
  lecturerId: string
): Promise<AttendanceSession | null> {
  const supabase = await createServiceClient();
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
  lecturerId: string
): Promise<AttendanceSession | null> {
  const supabase = await createServiceClient();
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
  if (!session || !isAttendanceSessionOpen(session)) return null;
  return session;
}

export async function countPresentStudents(attendanceSessionId: string): Promise<number> {
  const supabase = await createServiceClient();
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
  service?: Awaited<ReturnType<typeof createServiceClient>>
): Promise<number> {
  const supabase = service ?? (await createServiceClient());
  const { count } = await supabase
    .from("attendance_sessions")
    .select("*", { count: "exact", head: true })
    .eq("class_session_id", classSessionId)
    .lte("created_at", sessionCreatedAt);

  return count ?? 1;
}
