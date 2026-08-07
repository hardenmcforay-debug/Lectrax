import { createClient } from "@/lib/supabase/server";

export type LecturerAttendanceChartPoint = {
  name: string;
  rate: number;
};

/** Cap dashboard chart to recent classes; per-session head counts avoid loading all records. */
const ANALYTICS_CLASS_SESSION_CAP = 30;

export async function getLecturerAttendanceAnalytics(
  lecturerId: string
): Promise<LecturerAttendanceChartPoint[]> {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("id, course_code")
    .eq("lecturer_id", lecturerId)
    .order("created_at", { ascending: false })
    .limit(ANALYTICS_CLASS_SESSION_CAP);

  if (!sessions?.length) return [];

  const points = await Promise.all(
    sessions.map(async (s) => {
      const [
        { count: attendanceSessionCount },
        { count: recordCount },
        { count: enrollmentCount },
      ] = await Promise.all([
        supabase
          .from("attendance_sessions")
          .select("*", { count: "exact", head: true })
          .eq("class_session_id", s.id),
        supabase
          .from("attendance_records")
          .select("*", { count: "exact", head: true })
          .eq("class_session_id", s.id),
        supabase
          .from("enrollments")
          .select("*", { count: "exact", head: true })
          .eq("class_session_id", s.id),
      ]);

      const total = attendanceSessionCount ?? 0;
      const records = recordCount ?? 0;
      const students = enrollmentCount ?? 0;
      const denom = total * Math.max(students, 1);

      return {
        name: s.course_code,
        rate: denom > 0 ? Math.round((records / denom) * 100) : 0,
      };
    })
  );

  return points;
}
