import { createServiceClient } from "@/lib/supabase/server";
import { computeCourseCA, resolveAttendanceClassTotal } from "@/lib/ca/course-ca";
import type { ClassTest, SemesterType, StudentTableRow } from "@/types/database";
import type { CAWeights } from "@/lib/ca/constants";

export type ClassTestSummary = Pick<ClassTest, "id" | "title" | "test_number" | "max_score">;

export type ClassAssignmentSummary = {
  id: string;
  max_score: number;
};

export async function getStudentTableRows(
  classSessionId: string,
  semester: SemesterType,
  academicYear: string,
  lecturerId: string,
  weightOverride?: CAWeights
): Promise<{
  rows: StudentTableRow[];
  testCount: number;
  classTests: ClassTestSummary[];
  classAssignments: ClassAssignmentSummary[];
}> {
  const supabase = await createServiceClient();

  const { data: ownedSession } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("id", classSessionId)
    .eq("lecturer_id", lecturerId)
    .maybeSingle();

  if (!ownedSession) return { rows: [], testCount: 0, classTests: [], classAssignments: [] };

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      "id, student_id, manual_student_id, college_id, is_manual, profiles(full_name, college_id), manual_students(full_name, college_id)"
    )
    .eq("class_session_id", classSessionId);

  const { data: attendanceSessions } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("class_session_id", classSessionId);

  const sessionIds = attendanceSessions?.map((s) => s.id) ?? [];
  const totalSessions = sessionIds.length;

  const [{ data: caConfig }, { data: classTests }, { data: allTestScores }] = await Promise.all([
    supabase
      .from("ca_configurations")
      .select("attendance_weight, assignment_weight, test_weight, expected_class_count")
      .eq("class_session_id", classSessionId)
      .eq("semester", semester)
      .eq("academic_year", academicYear)
      .maybeSingle(),
    supabase
      .from("class_tests")
      .select("id, title, test_number, max_score, weight_percent")
      .eq("class_session_id", classSessionId)
      .eq("semester", semester)
      .eq("academic_year", academicYear)
      .order("test_number", { ascending: true }),
    supabase
      .from("test_scores")
      .select("enrollment_id, class_test_id, test_number, score, max_score")
      .eq("class_session_id", classSessionId)
      .eq("semester", semester)
      .eq("academic_year", academicYear),
  ]);

  const config = weightOverride
    ? {
        ...(caConfig ?? {
          attendance_weight: 0,
          assignment_weight: 0,
          test_weight: 0,
          expected_class_count: null,
        }),
        attendance_weight: weightOverride.attendance,
        assignment_weight: weightOverride.assignment,
        test_weight: weightOverride.test,
      }
    : (caConfig ?? {
        attendance_weight: 0,
        assignment_weight: 0,
        test_weight: 0,
        expected_class_count: null,
      });

  const attendanceClassTotal = resolveAttendanceClassTotal(
    config.expected_class_count,
    totalSessions
  );

  const tests = classTests ?? [];
  const scoresByEnrollment = new Map<string, typeof allTestScores>();
  for (const score of allTestScores ?? []) {
    const list = scoresByEnrollment.get(score.enrollment_id) ?? [];
    list.push(score);
    scoresByEnrollment.set(score.enrollment_id, list);
  }

  const { data: assignmentsData } = await supabase
    .from("assignments")
    .select("id, max_score")
    .eq("class_session_id", classSessionId)
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  const classAssignments = (assignmentsData ?? []) as { id: string; max_score: number }[];

  const assignmentIds = classAssignments.map((a) => a.id);
  const enrollmentIds = (enrollments ?? []).map((e) => e.id);

  // Fetch all submissions + grades in bulk to avoid N+1 queries in the UI table.
  const { data: assignmentSubmissions } = assignmentIds.length
    ? await supabase
        .from("assignment_submissions")
        .select("id, enrollment_id, assignment_id")
        .in("enrollment_id", enrollmentIds)
        .in("assignment_id", assignmentIds)
    : { data: [] };

  const submissionIds = (assignmentSubmissions ?? []).map((s) => s.id);

  const { data: assignmentGrades } = submissionIds.length
    ? await supabase
        .from("assignment_grades")
        .select("assignment_submission_id, grade")
        .in("assignment_submission_id", submissionIds)
    : { data: [] };

  const gradeBySubmissionId = new Map<string, number | null>(
    (assignmentGrades ?? []).map((g) => [g.assignment_submission_id, (g.grade ?? null) as number | null])
  );

  const submissionByEnrollmentAndAssignment = new Map<string, string>(
    (assignmentSubmissions ?? []).map((s) => [`${s.enrollment_id}:${s.assignment_id}`, s.id])
  );

  const attendedByEnrollment = new Map<string, number>();
  if (enrollmentIds.length && sessionIds.length) {
    const { data: attendanceRecords } = await supabase
      .from("attendance_records")
      .select("enrollment_id")
      .in("enrollment_id", enrollmentIds)
      .in("attendance_session_id", sessionIds);

    for (const record of attendanceRecords ?? []) {
      attendedByEnrollment.set(
        record.enrollment_id,
        (attendedByEnrollment.get(record.enrollment_id) ?? 0) + 1
      );
    }
  }

  const rows: StudentTableRow[] = [];

  for (const e of enrollments ?? []) {
    const name = e.is_manual
      ? (e.manual_students as unknown as { full_name: string })?.full_name
      : (e.profiles as unknown as { full_name: string })?.full_name;
    const collegeId =
      e.college_id ??
      (e.is_manual
        ? (e.manual_students as unknown as { college_id: string | null })?.college_id
        : (e.profiles as unknown as { college_id: string | null })?.college_id);

    const attendedCount = attendedByEnrollment.get(e.id) ?? 0;

    const assignmentGradesForCA = classAssignments.map((a) => {
      const submissionKey = `${e.id}:${a.id}`;
      const submissionId = submissionByEnrollmentAndAssignment.get(submissionKey);
      const grade = submissionId ? gradeBySubmissionId.get(submissionId) ?? null : null;
      return { grade, maxScore: Number(a.max_score) };
    });

    // Render up to 2 assignment columns in the CA table.
    // - 0 assignments -> one empty "Assignment" column, filled with '-'
    // - 1 assignment  -> one "Assignment" column
    // - 2+ assignments -> "Assignment 1" + "Assignment 2"
    const assignmentVisible = classAssignments.slice(0, 2);
    const assignmentDisplays =
      assignmentVisible.length === 0
        ? ["-"]
        : assignmentVisible.map((a) => {
            const submissionKey = `${e.id}:${a.id}`;
            const submissionId = submissionByEnrollmentAndAssignment.get(submissionKey);
            const grade = submissionId ? gradeBySubmissionId.get(submissionId) ?? null : null;
            return grade !== null ? `${grade}/${Number(a.max_score)}` : "-";
          });

    const enrollmentScores = scoresByEnrollment.get(e.id) ?? [];
    const courseCa = computeCourseCA(config, {
      attendedSessions: attendedCount,
      totalSessions: attendanceClassTotal,
      assignmentGrades: assignmentGradesForCA,
      testScores: enrollmentScores.map((s) => ({
        test_number: s.test_number ?? 1,
        score: Number(s.score),
        max_score: Number(s.max_score),
        class_test_id: s.class_test_id ?? undefined,
      })),
      classTests: tests,
    });

    rows.push({
      enrollmentId: e.id,
      studentId: e.student_id,
      manualStudentId: e.manual_student_id,
      name: name ?? "Unknown",
      collegeId: collegeId ?? null,
      attendancePercentage: courseCa.attendancePercent,
      totalAttendance: attendedCount,
      totalSessions: attendanceClassTotal,
      assignmentDisplays,
      test1Display: courseCa.test1Display,
      test2Display: courseCa.test2Display,
      totalCADisplay: courseCa.totalCADisplay,
      semester,
      academicYear,
      isManual: e.is_manual,
    });
  }

  return {
    rows,
    testCount: tests.length,
    classTests: tests as ClassTestSummary[],
    classAssignments: classAssignments as ClassAssignmentSummary[],
  };
}
