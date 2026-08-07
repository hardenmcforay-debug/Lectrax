import { createClient } from "@/lib/supabase/server";
import { computeCourseCA, resolveAttendanceClassTotal } from "@/lib/ca/course-ca";
import type { ClassTest, SemesterType, StudentTableRow } from "@/types/database";
import { parseCaWeights, type CAWeights } from "@/lib/ca/constants";
import {
  PAGINATION,
  toRangeBounds,
  type OffsetPaginationInput,
} from "@/lib/pagination";

export type ClassTestSummary = Pick<ClassTest, "id" | "title" | "test_number" | "max_score">;

export type ClassAssignmentSummary = {
  id: string;
  max_score: number;
};

/** Safety cap when loading all enrollments for export (no pagination). */
const EXPORT_ENROLLMENT_CAP = PAGINATION.MAX_PAGE_SIZE * 20;

export async function getStudentTableRows(
  classSessionId: string,
  semester: SemesterType,
  academicYear: string,
  lecturerId: string,
  weightOverride?: CAWeights,
  pagination?: OffsetPaginationInput
): Promise<{
  rows: StudentTableRow[];
  testCount: number;
  classTests: ClassTestSummary[];
  classAssignments: ClassAssignmentSummary[];
  total: number;
}> {
  const supabase = await createClient();

  const { data: ownedSession } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("id", classSessionId)
    .eq("lecturer_id", lecturerId)
    .maybeSingle();

  if (!ownedSession) {
    return { rows: [], testCount: 0, classTests: [], classAssignments: [], total: 0 };
  }

  const { count: enrollmentCount } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("class_session_id", classSessionId);

  const total = enrollmentCount ?? 0;

  let enrollmentsQuery = supabase
    .from("enrollments")
    .select(
      "id, student_id, manual_student_id, college_id, is_manual, profiles(full_name, college_id), manual_students(full_name, college_id)"
    )
    .eq("class_session_id", classSessionId)
    .order("created_at", { ascending: true });

  if (pagination) {
    const { from, to } = toRangeBounds(pagination.page, pagination.pageSize);
    enrollmentsQuery = enrollmentsQuery.range(from, to);
  } else {
    // Export / full-load path: no offset pagination, but hard-cap for safety.
    enrollmentsQuery = enrollmentsQuery.limit(EXPORT_ENROLLMENT_CAP);
  }

  const { data: enrollments } = await enrollmentsQuery;

  const { count: attendanceSessionCount } = await supabase
    .from("attendance_sessions")
    .select("id", { count: "exact", head: true })
    .eq("class_session_id", classSessionId);

  const totalSessions = attendanceSessionCount ?? 0;

  const [{ data: caConfig }, { data: classTests }] = await Promise.all([
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
  ]);

  const storedWeights = parseCaWeights(
    caConfig?.attendance_weight,
    caConfig?.assignment_weight,
    caConfig?.test_weight
  );
  const weights = weightOverride ?? storedWeights;

  const config = {
    ...(caConfig ?? { expected_class_count: null }),
    attendance_weight: weights.attendance,
    assignment_weight: weights.assignment,
    test_weight: weights.test,
  };

  const attendanceClassTotal = resolveAttendanceClassTotal(
    config.expected_class_count,
    totalSessions
  );

  const tests = classTests ?? [];
  const enrollmentIds = (enrollments ?? []).map((e) => e.id);

  const { data: allTestScores } = enrollmentIds.length
    ? await supabase
        .from("test_scores")
        .select("enrollment_id, class_test_id, test_number, score, max_score")
        .eq("class_session_id", classSessionId)
        .eq("semester", semester)
        .eq("academic_year", academicYear)
        .in("enrollment_id", enrollmentIds)
    : { data: [] as { enrollment_id: string; class_test_id: string | null; test_number: number | null; score: number; max_score: number }[] };

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
    .order("created_at", { ascending: true })
    .limit(PAGINATION.MAX_PAGE_SIZE);

  const classAssignments = (assignmentsData ?? []) as { id: string; max_score: number }[];

  const assignmentIds = classAssignments.map((a) => a.id);

  // Fetch submissions + grades only for this page's enrollments (avoids N+1 and unbounded fan-out).
  const { data: assignmentSubmissions } =
    assignmentIds.length && enrollmentIds.length
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
  if (enrollmentIds.length && totalSessions > 0) {
    const { data: attendanceRecords } = await supabase
      .from("attendance_records")
      .select("enrollment_id")
      .eq("class_session_id", classSessionId)
      .in("enrollment_id", enrollmentIds)
      .limit(EXPORT_ENROLLMENT_CAP);

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
    total,
  };
}
