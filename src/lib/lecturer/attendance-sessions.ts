import { createClient } from "@/lib/supabase/server";
import {
  PAGINATION,
  toRangeBounds,
  type OffsetPaginationInput,
} from "@/lib/pagination";

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
  lecturerId: string,
  pagination?: OffsetPaginationInput
): Promise<{ students: AttendancePresentStudent[]; total: number } | null> {
  const supabase = await createClient();

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

  const selectCols =
    "enrollment_id, marked_at, mark_method, enrollments(is_manual, college_id, profiles(full_name, college_id), manual_students(full_name, college_id))";

  if (pagination) {
    const { count, error: countError } = await supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("attendance_session_id", attendanceSessionId);

    if (countError) {
      throw new Error(countError.message);
    }

    const { from, to } = toRangeBounds(pagination.page, pagination.pageSize);
    const { data: records, error } = await supabase
      .from("attendance_records")
      .select(selectCols)
      .eq("attendance_session_id", attendanceSessionId)
      .order("marked_at", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    return {
      students: (records ?? []).map((record) => mapPresentStudentRecord(record)),
      total: count ?? 0,
    };
  }

  // Unpaginated callers still get a hard safety cap.
  const { count } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("attendance_session_id", attendanceSessionId);

  const { data: records, error } = await supabase
    .from("attendance_records")
    .select(selectCols)
    .eq("attendance_session_id", attendanceSessionId)
    .order("marked_at", { ascending: true })
    .limit(PAGINATION.MAX_PRESENT_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  const students = (records ?? []).map((record) => mapPresentStudentRecord(record));
  return { students, total: count ?? students.length };
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
  const supabase = await createClient();

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
    .eq("lecturer_id", lecturerId)
    .order("created_at", { ascending: false })
    .limit(PAGINATION.MAX_PAGE_SIZE);

  const sessionIds = (attendanceSessions ?? []).map((s) => s.id);
  if (sessionIds.length === 0) return {};

  const bySession = Object.fromEntries(sessionIds.map((id) => [id, [] as AttendancePresentStudent[]]));

  // Hard cap across all sessions to avoid unbounded fan-out (MAX_PAGE_SIZE * 20).
  const { data: records, error } = await supabase
    .from("attendance_records")
    .select(
      "attendance_session_id, enrollment_id, marked_at, mark_method, enrollments(is_manual, college_id, profiles(full_name, college_id), manual_students(full_name, college_id))"
    )
    .in("attendance_session_id", sessionIds)
    .order("marked_at", { ascending: true })
    .limit(PAGINATION.MAX_PAGE_SIZE * 20);

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
