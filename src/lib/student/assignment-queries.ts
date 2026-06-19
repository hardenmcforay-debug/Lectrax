import { createClient } from "@/lib/supabase/server";
import {
  batchAssignmentsBeforeDeadline,
  isAssignmentBeforeDeadline,
} from "@/lib/assignments/deadline-server";
import { getSignedSubmissionUrl } from "@/lib/assignments/submissions";

export type StudentAssignmentListItem = {
  id: string;
  title: string;
  deadline: string;
  max_score: number;
  course_code: string;
  submissionStatus: "not_submitted" | "submitted" | "graded" | "locked";
  gradeDisplay: string | null;
  pastDeadline: boolean;
};

export type StudentAssignmentSubmission = {
  id: string;
  file_name: string | null;
  file_size: number;
  submitted_at: string;
  submission_status: string;
};

export type StudentAssignmentDetailData = {
  assignment: {
    id: string;
    title: string;
    description: string | null;
    deadline: string;
    class_session_id: string;
    lecturer_id: string;
    max_score: number;
    is_published: boolean;
  };
  enrollmentId: string;
  submission: StudentAssignmentSubmission | null;
  grade: number | null;
  downloadUrl: string | null;
  pastDeadline: boolean;
};

export async function getStudentAssignmentsList(
  studentId: string
): Promise<StudentAssignmentListItem[]> {
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, class_session_id")
    .eq("student_id", studentId);

  if (!enrollments?.length) return [];

  const enrollmentBySessionId = new Map(
    enrollments.map((e) => [e.class_session_id as string, e.id as string])
  );
  const classSessionIds = enrollments.map((e) => e.class_session_id as string);

  const [, assignmentsResult] = await Promise.all([
    supabase.rpc("lock_expired_assignment_submissions", { p_assignment_id: null }),
    supabase
      .from("assignments")
      .select("id, title, deadline, max_score, class_session_id, class_sessions(course_code)")
      .in("class_session_id", classSessionIds)
      .eq("is_published", true)
      .order("deadline", { ascending: true }),
  ]);

  const assignmentList = assignmentsResult.data ?? [];
  if (!assignmentList.length) return [];

  const assignmentIds = assignmentList.map((a) => a.id as string);
  const enrollmentIds = Array.from(enrollmentBySessionId.values());

  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select("id, assignment_id, enrollment_id, submission_status")
    .in("assignment_id", assignmentIds)
    .in("enrollment_id", enrollmentIds)
    .eq("student_id", studentId);

  const submissionIds = (submissions ?? []).map((s) => s.id as string);
  const { data: grades } = submissionIds.length
    ? await supabase
        .from("assignment_grades")
        .select("assignment_submission_id, grade")
        .in("assignment_submission_id", submissionIds)
    : { data: [] as { assignment_submission_id: string; grade: number | null }[] };

  const gradeBySubmissionId = new Map(
    (grades ?? []).map((g) => [g.assignment_submission_id as string, g.grade as number | null])
  );

  const beforeDeadlineFlags = await batchAssignmentsBeforeDeadline(
    assignmentList.map((a) => ({
      id: a.id as string,
      deadline: a.deadline as string,
    }))
  );

  return assignmentList.map((a, index) => {
    const session = a.class_sessions as unknown as { course_code: string } | null;
    const courseCode = session?.course_code ?? "—";
    const enrollmentId = enrollmentBySessionId.get(a.class_session_id as string);
    const submission = (submissions ?? []).find(
      (s) => s.assignment_id === a.id && s.enrollment_id === enrollmentId
    );
    const beforeDeadline = beforeDeadlineFlags[index];
    const pastDeadline = !beforeDeadline;

    if (!submission) {
      const deadline = a.deadline as string;
      return {
        id: a.id as string,
        title: a.title as string,
        deadline,
        max_score: Number(a.max_score),
        course_code: courseCode,
        submissionStatus: beforeDeadline ? ("not_submitted" as const) : ("locked" as const),
        gradeDisplay: null,
        pastDeadline,
      };
    }

    if (submission.submission_status === "locked") {
      const grade = gradeBySubmissionId.get(submission.id as string) ?? null;
      return {
        id: a.id as string,
        title: a.title as string,
        deadline: a.deadline as string,
        max_score: Number(a.max_score),
        course_code: courseCode,
        submissionStatus: "locked" as const,
        gradeDisplay: grade !== null ? `${grade}/${Number(a.max_score)}` : null,
        pastDeadline,
      };
    }

    const grade = gradeBySubmissionId.get(submission.id as string) ?? null;
    if (grade !== null) {
      return {
        id: a.id as string,
        title: a.title as string,
        deadline: a.deadline as string,
        max_score: Number(a.max_score),
        course_code: courseCode,
        submissionStatus: "graded" as const,
        gradeDisplay: `${grade}/${Number(a.max_score)}`,
        pastDeadline,
      };
    }

    return {
      id: a.id as string,
      title: a.title as string,
      deadline: a.deadline as string,
      max_score: Number(a.max_score),
      course_code: courseCode,
      submissionStatus: "submitted" as const,
      gradeDisplay: null,
      pastDeadline,
    };
  });
}

export async function getStudentAssignmentDetail(
  studentId: string,
  assignmentId: string
): Promise<StudentAssignmentDetailData | null> {
  const supabase = await createClient();

  const [, assignmentResult] = await Promise.all([
    supabase.rpc("lock_expired_assignment_submissions", { p_assignment_id: assignmentId }),
    supabase
      .from("assignments")
      .select(
        "id, title, description, deadline, class_session_id, lecturer_id, max_score, is_published"
      )
      .eq("id", assignmentId)
      .eq("is_published", true)
      .maybeSingle(),
  ]);

  const assignmentData = assignmentResult.data;
  if (!assignmentData) return null;

  const [{ data: enrollment }, { data: submissionData }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", studentId)
      .eq("class_session_id", assignmentData.class_session_id)
      .maybeSingle(),
    supabase
      .from("assignment_submissions")
      .select("id, file_name, file_size, submitted_at, submission_status, storage_path")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .maybeSingle(),
  ]);

  if (!enrollment) return null;

  const submission = submissionData
    ? {
        id: submissionData.id as string,
        file_name: submissionData.file_name as string | null,
        file_size: Number(submissionData.file_size),
        submitted_at: submissionData.submitted_at as string,
        submission_status: submissionData.submission_status as string,
      }
    : null;

  const [gradeResult, downloadUrl] = await Promise.all([
    submission
      ? supabase
          .from("assignment_grades")
          .select("grade")
          .eq("assignment_submission_id", submission.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    submissionData?.storage_path
      ? getSignedSubmissionUrl(supabase, submissionData.storage_path as string)
      : Promise.resolve(null),
  ]);

  const deadline = assignmentData.deadline as string;
  const beforeDeadline = await isAssignmentBeforeDeadline(null, assignmentId, deadline);
  const pastDeadline = !beforeDeadline;

  return {
    assignment: assignmentData as StudentAssignmentDetailData["assignment"],
    enrollmentId: enrollment.id as string,
    submission,
    grade:
      gradeResult.data?.grade !== undefined
        ? (gradeResult.data.grade as number | null)
        : null,
    downloadUrl,
    pastDeadline,
  };
}
