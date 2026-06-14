import type { SupabaseClient } from "@supabase/supabase-js";

export type StudentNotificationType = "assignment" | "grade" | "attendance";

export type StudentNotificationCounts = Record<StudentNotificationType, number>;

export const EMPTY_STUDENT_NOTIFICATION_COUNTS: StudentNotificationCounts = {
  assignment: 0,
  grade: 0,
  attendance: 0,
};

type CreateStudentNotificationsInput = {
  studentIds: string[];
  classSessionId: string;
  type: StudentNotificationType;
  referenceId?: string | null;
  title: string;
  message: string;
};

export async function getClassSessionLabel(
  service: SupabaseClient,
  classSessionId: string
): Promise<string> {
  const { data } = await service
    .from("class_sessions")
    .select("course_code, title")
    .eq("id", classSessionId)
    .maybeSingle();

  if (!data) return "your class";
  return data.course_code ? `${data.course_code} — ${data.title}` : data.title;
}

export async function createStudentNotifications(
  service: SupabaseClient,
  input: CreateStudentNotificationsInput
): Promise<void> {
  const studentIds = [...new Set(input.studentIds)].filter(Boolean);
  if (studentIds.length === 0) return;

  const rows = studentIds.map((studentId) => ({
    student_id: studentId,
    class_session_id: input.classSessionId,
    type: input.type,
    reference_id: input.referenceId ?? null,
    title: input.title,
    message: input.message,
  }));

  const { error } = await service.from("student_notifications").insert(rows);
  if (error) {
    console.error("[student_notifications] insert failed:", error.message);
  }
}

export async function notifyEnrolledStudentsInClass(
  service: SupabaseClient,
  classSessionId: string,
  input: Omit<CreateStudentNotificationsInput, "studentIds" | "classSessionId">
): Promise<void> {
  const { data: enrollments } = await service
    .from("enrollments")
    .select("student_id")
    .eq("class_session_id", classSessionId)
    .eq("is_manual", false)
    .not("student_id", "is", null);

  const studentIds = (enrollments ?? [])
    .map((row) => row.student_id as string)
    .filter(Boolean);

  await createStudentNotifications(service, { ...input, classSessionId, studentIds });
}

export async function notifyStudentsByEnrollmentIds(
  service: SupabaseClient,
  enrollmentIds: string[],
  input: Omit<CreateStudentNotificationsInput, "studentIds" | "classSessionId"> & {
    classSessionId: string;
  }
): Promise<void> {
  const uniqueEnrollmentIds = [...new Set(enrollmentIds)].filter(Boolean);
  if (uniqueEnrollmentIds.length === 0) return;

  const { data: enrollments } = await service
    .from("enrollments")
    .select("student_id")
    .in("id", uniqueEnrollmentIds)
    .eq("is_manual", false)
    .not("student_id", "is", null);

  const studentIds = (enrollments ?? [])
    .map((row) => row.student_id as string)
    .filter(Boolean);

  await createStudentNotifications(service, { ...input, studentIds });
}

export function aggregateNotificationCounts(
  rows: { type: StudentNotificationType }[]
): StudentNotificationCounts {
  const counts = { ...EMPTY_STUDENT_NOTIFICATION_COUNTS };
  for (const row of rows) {
    counts[row.type] += 1;
  }
  return counts;
}

export const NOTIFICATION_DESTINATION: Record<StudentNotificationType, string> = {
  assignment: "/student/assignments",
  grade: "/student/academic-overview",
  attendance: "/student/scan",
};
