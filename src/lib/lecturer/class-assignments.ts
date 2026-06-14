import { ASSIGNMENT_SUBMISSIONS_BUCKET } from "@/lib/assignments/storage";
import { createServiceClient } from "@/lib/supabase/server";
import type { Assignment, ClassSession } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface DeleteClassAssignmentResult {
  deletedAssignmentId: string;
  deletedSubmissions: number;
}

export interface AssignmentGradeRow {
  enrollmentId: string;
  name: string;
  collegeId: string | null;
  isManual: boolean;
  fileName: string | null;
  submittedAt: string | null;
  hasSubmission: boolean;
  grade: number | null;
}

export interface AssignmentGradeEntryData {
  assignment: Pick<Assignment, "id" | "title" | "max_score" | "deadline" | "class_session_id">;
  session: Pick<ClassSession, "id" | "course_code" | "title" | "class_name" | "semester" | "academic_year">;
  rows: AssignmentGradeRow[];
}

export async function getClassAssignmentForLecturer(
  assignmentId: string,
  lecturerId: string
): Promise<Assignment | null> {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .eq("lecturer_id", lecturerId)
    .maybeSingle();

  return data as Assignment | null;
}

/** Create or return a grade-only submission row when the student has no PDF. */
export async function ensureAssignmentSubmissionForGrading(
  supabase: SupabaseClient,
  assignment: Pick<Assignment, "id" | "lecturer_id" | "class_session_id">,
  enrollmentId: string
): Promise<string> {
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id, student_id, is_manual")
    .eq("id", enrollmentId)
    .eq("class_session_id", assignment.class_session_id)
    .maybeSingle();

  if (enrollmentError || !enrollment) {
    throw new Error("Enrollment not found for this class.");
  }

  const { data: existing } = await supabase
    .from("assignment_submissions")
    .select("id")
    .eq("assignment_id", assignment.id)
    .eq("enrollment_id", enrollmentId)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: created, error: insertError } = await supabase
    .from("assignment_submissions")
    .insert({
      assignment_id: assignment.id,
      enrollment_id: enrollmentId,
      student_id: enrollment.is_manual ? null : (enrollment.student_id as string),
      lecturer_id: assignment.lecturer_id,
      class_session_id: assignment.class_session_id,
      file_name: enrollment.is_manual
        ? "No submission (manual student)"
        : "No submission (lecturer graded)",
      file_size: 0,
      storage_path: null,
      submission_status: "locked",
    })
    .select("id")
    .single();

  if (insertError || !created?.id) {
    throw new Error(insertError?.message ?? "Could not create grade record.");
  }

  return created.id as string;
}

/** @deprecated Use ensureAssignmentSubmissionForGrading */
export const ensureManualAssignmentSubmission = ensureAssignmentSubmissionForGrading;

/** Delete an assignment, its submission PDFs in storage, and all related grades. */
export async function deleteClassAssignment(
  assignmentId: string,
  lecturerId: string
): Promise<DeleteClassAssignmentResult | null> {
  const supabase = await createServiceClient();
  const assignment = await getClassAssignmentForLecturer(assignmentId, lecturerId);
  if (!assignment) return null;

  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select("storage_path")
    .eq("assignment_id", assignmentId);

  const storagePaths = (submissions ?? [])
    .map((s) => s.storage_path)
    .filter((path): path is string => Boolean(path));

  if (storagePaths.length > 0) {
    await supabase.storage.from(ASSIGNMENT_SUBMISSIONS_BUCKET).remove(storagePaths);
  }

  const { error: deleteError } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("lecturer_id", lecturerId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return {
    deletedAssignmentId: assignmentId,
    deletedSubmissions: submissions?.length ?? 0,
  };
}

export async function getAssignmentGradeEntryData(
  assignmentId: string,
  lecturerId: string
): Promise<AssignmentGradeEntryData | null> {
  const assignment = await getClassAssignmentForLecturer(assignmentId, lecturerId);
  if (!assignment) return null;

  const supabase = await createServiceClient();

  const { data: session } = await supabase
    .from("class_sessions")
    .select("id, course_code, title, class_name, semester, academic_year")
    .eq("id", assignment.class_session_id)
    .maybeSingle();

  if (!session) return null;

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, is_manual, college_id, profiles(full_name, college_id), manual_students(full_name, college_id)")
    .eq("class_session_id", assignment.class_session_id)
    .order("joined_at", { ascending: true });

  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select("id, enrollment_id, file_name, file_size, storage_path, submitted_at")
    .eq("assignment_id", assignment.id);

  const submissionIds = (submissions ?? []).map((s) => s.id);

  const { data: grades } = submissionIds.length
    ? await supabase
        .from("assignment_grades")
        .select("assignment_submission_id, grade")
        .in("assignment_submission_id", submissionIds)
    : { data: [] };

  const gradeBySubmissionId = new Map<string, number | null>(
    (grades ?? []).map((g) => [g.assignment_submission_id, (g.grade ?? null) as number | null])
  );

  type SubmissionRow = {
    id: string;
    enrollment_id: string;
    file_name: string | null;
    storage_path: string | null;
    submitted_at: string | null;
  };

  const submissionByEnrollmentId = new Map<string, SubmissionRow>();
  for (const s of submissions ?? []) {
    submissionByEnrollmentId.set(s.enrollment_id as string, s as SubmissionRow);
  }

  const rows: AssignmentGradeRow[] = (enrollments ?? []).map((e) => {
    const manual = e.manual_students as unknown as
      | { full_name: string; college_id: string | null }
      | null
      | undefined;
    const profile = e.profiles as unknown as
      | { full_name: string; college_id: string | null }
      | null
      | undefined;

    const name = e.is_manual ? manual?.full_name : profile?.full_name;
    const collegeId = e.college_id ?? (e.is_manual ? manual?.college_id : profile?.college_id);

    const submission = submissionByEnrollmentId.get(e.id);
    const grade = submission?.id ? gradeBySubmissionId.get(submission.id) ?? null : null;

    return {
      enrollmentId: e.id,
      name: name ?? "Unknown",
      collegeId: collegeId ?? null,
      isManual: e.is_manual,
      fileName: submission?.file_name ?? null,
      submittedAt: submission?.submitted_at ?? null,
      hasSubmission: Boolean(submission?.storage_path),
      grade,
    };
  });

  return {
    assignment: {
      id: assignment.id,
      title: assignment.title,
      max_score: Number(assignment.max_score),
      deadline: assignment.deadline,
      class_session_id: assignment.class_session_id,
    },
    session: session as AssignmentGradeEntryData["session"],
    rows,
  };
}

