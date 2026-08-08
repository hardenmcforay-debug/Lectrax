import { createClient } from "@/lib/supabase/server";

export type LecturerAttendanceChartPoint = {
  name: string;
  rate: number;
};

export async function getLecturerAttendanceAnalytics(
  lecturerId: string
): Promise<LecturerAttendanceChartPoint[]> {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("id, course_code")
    .eq("lecturer_id", lecturerId);

  if (!sessions?.length) return [];

  const sessionIds = sessions.map((s) => s.id);

  const [
    { data: attendanceSessions },
    { data: attendanceRecords },
    { data: enrollments },
  ] = await Promise.all([
    supabase.from("attendance_sessions").select("id, class_session_id").in("class_session_id", sessionIds),
    supabase.from("attendance_records").select("class_session_id").in("class_session_id", sessionIds),
    supabase.from("enrollments").select("class_session_id").in("class_session_id", sessionIds),
  ]);

  const totalSessionsByClass = new Map<string, number>();
  for (const row of attendanceSessions ?? []) {
    totalSessionsByClass.set(
      row.class_session_id,
      (totalSessionsByClass.get(row.class_session_id) ?? 0) + 1
    );
  }

  const recordsByClass = new Map<string, number>();
  for (const row of attendanceRecords ?? []) {
    recordsByClass.set(row.class_session_id, (recordsByClass.get(row.class_session_id) ?? 0) + 1);
  }

  const studentsByClass = new Map<string, number>();
  for (const row of enrollments ?? []) {
    studentsByClass.set(row.class_session_id, (studentsByClass.get(row.class_session_id) ?? 0) + 1);
  }

  return sessions.map((s) => {
    const total = totalSessionsByClass.get(s.id) ?? 0;
    const records = recordsByClass.get(s.id) ?? 0;
    const students = studentsByClass.get(s.id) ?? 0;
    const denom = total * Math.max(students, 1);
    return {
      name: s.course_code,
      rate: denom > 0 ? Math.round((records / denom) * 100) : 0,
    };
  });
}
