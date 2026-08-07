import "server-only";

import { ASSIGNMENT_SUBMISSIONS_BUCKET } from "@/lib/assignments/storage";
import { createClient } from "@/lib/supabase/server";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";

export type RemoveEnrollmentResult = {
  enrollmentId: string;
  studentName: string;
  wasManual: boolean;
  deletedSubmissionFiles: number;
};

/**
 * Remove a student from a class session (joined or manual).
 * Cleans assignment submission files, then deletes enrollment data.
 * Manual students: delete `manual_students` (cascades enrollment + child rows).
 * Joined students: delete enrollment (cascades attendance, scores, submissions).
 */
export async function removeEnrollmentFromSession(
  classSessionId: string,
  enrollmentId: string,
  lecturerId: string
): Promise<RemoveEnrollmentResult | null> {
  const session = await getClassSessionForLecturer(classSessionId, lecturerId);
  if (!session) return null;

  const supabase = await createClient();

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select(
      "id, is_manual, manual_student_id, student_id, profiles(full_name), manual_students(full_name)"
    )
    .eq("id", enrollmentId)
    .eq("class_session_id", classSessionId)
    .maybeSingle();

  if (enrollmentError) {
    throw new Error(enrollmentError.message);
  }

  if (!enrollment) return null;

  const manualName = (
    enrollment.manual_students as unknown as { full_name: string } | null
  )?.full_name;
  const profileName = (
    enrollment.profiles as unknown as { full_name: string } | null
  )?.full_name;
  const studentName = manualName ?? profileName ?? "Student";

  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select("storage_path")
    .eq("enrollment_id", enrollmentId)
    .eq("class_session_id", classSessionId);

  const storagePaths = (submissions ?? [])
    .map((row) => row.storage_path)
    .filter((path): path is string => Boolean(path));

  if (storagePaths.length > 0) {
    await supabase.storage.from(ASSIGNMENT_SUBMISSIONS_BUCKET).remove(storagePaths);
  }

  if (enrollment.is_manual && enrollment.manual_student_id) {
    const { error: manualDeleteError } = await supabase
      .from("manual_students")
      .delete()
      .eq("id", enrollment.manual_student_id)
      .eq("class_session_id", classSessionId);

    if (manualDeleteError) {
      throw new Error(manualDeleteError.message);
    }
  } else {
    const { error: enrollDeleteError } = await supabase
      .from("enrollments")
      .delete()
      .eq("id", enrollmentId)
      .eq("class_session_id", classSessionId);

    if (enrollDeleteError) {
      throw new Error(enrollDeleteError.message);
    }
  }

  return {
    enrollmentId,
    studentName,
    wasManual: Boolean(enrollment.is_manual),
    deletedSubmissionFiles: storagePaths.length,
  };
}
