import { createServiceClient } from "@/lib/supabase/server";

export interface AttendancePresentStudent {
  enrollmentId: string;
  name: string;
  collegeId: string | null;
  markedAt: string;
  markMethod: string;
}

export async function getAttendanceSessionPresentStudents(
  classSessionId: string,
  attendanceSessionId: string,
  lecturerId: string
): Promise<AttendancePresentStudent[] | null> {
  const supabase = await createServiceClient();

  const { data: attendanceSession } = await supabase
    .from("attendance_sessions")
    .select("id, class_session_id, lecturer_id")
    .eq("id", attendanceSessionId)
    .maybeSingle();

  if (
    !attendanceSession ||
    attendanceSession.class_session_id !== classSessionId ||
    attendanceSession.lecturer_id !== lecturerId
  ) {
    return null;
  }

  const { data: records, error } = await supabase
    .from("attendance_records")
    .select(
      "enrollment_id, marked_at, mark_method, enrollments(is_manual, college_id, profiles(full_name, college_id), manual_students(full_name, college_id))"
    )
    .eq("attendance_session_id", attendanceSessionId)
    .order("marked_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (records ?? []).map((record) => mapPresentStudentRecord(record));
}

function mapPresentStudentRecord(record: {
  enrollment_id: string;
  marked_at: string;
  mark_method: string;
  enrollments: unknown;
}): AttendancePresentStudent {
  const enrollment = record.enrollments as {
    is_manual: boolean;
    college_id: string | null;
    profiles: { full_name: string; college_id: string | null } | null;
    manual_students: { full_name: string; college_id: string | null } | null;
  };

  const name = enrollment.is_manual
    ? enrollment.manual_students?.full_name
    : enrollment.profiles?.full_name;

  const collegeId =
    enrollment.college_id ??
    (enrollment.is_manual
      ? enrollment.manual_students?.college_id
      : enrollment.profiles?.college_id);

  return {
    enrollmentId: record.enrollment_id,
    name: name ?? "Unknown",
    collegeId: collegeId ?? null,
    markedAt: record.marked_at,
    markMethod: record.mark_method,
  };
}

/** Load present students for every attendance session in a class (single bulk query). */
export async function getBulkAttendanceSessionPresentStudents(
  classSessionId: string,
  lecturerId: string
): Promise<Record<string, AttendancePresentStudent[]>> {
  const supabase = await createServiceClient();

  const { data: ownedSession } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("id", classSessionId)
    .eq("lecturer_id", lecturerId)
    .maybeSingle();

  if (!ownedSession) return {};

  const { data: attendanceSessions } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("class_session_id", classSessionId)
    .eq("lecturer_id", lecturerId);

  const sessionIds = (attendanceSessions ?? []).map((s) => s.id);
  if (sessionIds.length === 0) return {};

  const bySession = Object.fromEntries(sessionIds.map((id) => [id, [] as AttendancePresentStudent[]]));

  const { data: records, error } = await supabase
    .from("attendance_records")
    .select(
      "attendance_session_id, enrollment_id, marked_at, mark_method, enrollments(is_manual, college_id, profiles(full_name, college_id), manual_students(full_name, college_id))"
    )
    .in("attendance_session_id", sessionIds)
    .order("marked_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  for (const record of records ?? []) {
    const sessionId = record.attendance_session_id as string;
    if (!bySession[sessionId]) continue;
    bySession[sessionId].push(mapPresentStudentRecord(record));
  }

  return bySession;
}
