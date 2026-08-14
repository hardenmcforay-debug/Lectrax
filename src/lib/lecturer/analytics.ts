import { createClient } from "@/lib/supabase/server";

export type LecturerAttendanceChartPoint = {
  name: string;
  rate: number;
};

type LecturerAttendanceClassTotal = {
  class_session_id: string;
  course_code: string;
  attendance_session_count: number | string;
  attendance_record_count: number | string;
  enrollment_count: number | string;
};

export async function getLecturerAttendanceAnalytics(
  lecturerId: string
): Promise<LecturerAttendanceChartPoint[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("lecturer_attendance_class_totals", {
    p_lecturer_id: lecturerId,
  });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[lecturer analytics] attendance totals failed", error);
    }
    return [];
  }

  return ((data ?? []) as LecturerAttendanceClassTotal[]).map((row) => {
    const total = Number(row.attendance_session_count) || 0;
    const records = Number(row.attendance_record_count) || 0;
    const students = Number(row.enrollment_count) || 0;
    const denom = total * Math.max(students, 1);
    return {
      name: row.course_code,
      rate: denom > 0 ? Math.round((records / denom) * 100) : 0,
    };
  });
}
