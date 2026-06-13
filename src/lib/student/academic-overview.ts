import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getDisplayName } from "@/lib/auth/display-name";
import { computeCourseCA, resolveAttendanceClassTotal } from "@/lib/ca/course-ca";
import type { SemesterType } from "@/types/database";

export interface AssessmentScore {
  label: string;
  title: string;
  score: number | null;
  maxScore: number;
  percent: number | null;
}

export interface CourseAcademicOverview {
  enrollmentId: string;
  classSessionId: string;
  courseCode: string;
  courseTitle: string;
  semester: SemesterType;
  academicYear: string;
  studentName: string;
  collegeId: string | null;
  attendancePercent: number;
  totalAttended: number;
  totalSessions: number;
  assignmentPercent: number | null;
  assignmentDisplays: string[];
  testCount: number;
  test1Display: string;
  test2Display: string;
  totalCADisplay: string;
  caPercent: number;
  assignments: AssessmentScore[];
  tests: AssessmentScore[];
}

export interface StudentAcademicOverview {
  studentName: string;
  collegeId: string | null;
  courses: CourseAcademicOverview[];
  submittedCount: number;
  totalAssignments: number;
}

export async function getStudentAcademicOverview(
  studentId: string
): Promise<StudentAcademicOverview | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== studentId) return null;

  const profile = await getProfileByUserId(studentId);

  const studentName = getDisplayName(user, profile);
  const collegeId = profile?.college_id ?? null;

  const db = await createServiceClient();

  const { data: enrollments } = await db
    .from("enrollments")
    .select("id, class_session_id, college_id")
    .eq("student_id", studentId)
    .order("joined_at", { ascending: false });

  if (!enrollments?.length) {
    return { studentName, collegeId, courses: [], submittedCount: 0, totalAssignments: 0 };
  }

  const enrollmentIds = enrollments.map((e) => e.id);
  const classSessionIds = enrollments.map((e) => e.class_session_id);

  const { data: classSessions } = await db
    .from("class_sessions")
    .select("id, title, course_code, semester, academic_year, class_name")
    .in("id", classSessionIds);

  const classSessionById = new Map((classSessions ?? []).map((cs) => [cs.id, cs]));

  const [
    { data: attendanceSessions },
    { data: attendanceRecords },
    { data: assignments },
    { data: testScores },
    { data: classTests },
    { data: caConfigs },
  ] = await Promise.all([
    db.from("attendance_sessions").select("id, class_session_id").in("class_session_id", classSessionIds),
    db
      .from("attendance_records")
      .select("enrollment_id, attendance_session_id")
      .in("enrollment_id", enrollmentIds),
    db
      .from("assignments")
      .select("id, class_session_id, title, max_score, created_at")
      .in("class_session_id", classSessionIds)
      .eq("is_published", true)
      .order("created_at", { ascending: true }),
    db
      .from("test_scores")
      .select(
        "enrollment_id, class_session_id, class_test_id, test_number, score, max_score, title"
      )
      .in("enrollment_id", enrollmentIds)
      .order("test_number", { ascending: true }),
    db
      .from("class_tests")
      .select("id, class_session_id, test_number, title, max_score, weight_percent, semester, academic_year")
      .in("class_session_id", classSessionIds)
      .order("test_number", { ascending: true }),
    db
      .from("ca_configurations")
      .select(
        "class_session_id, semester, academic_year, attendance_weight, assignment_weight, test_weight, expected_class_count"
      )
      .in("class_session_id", classSessionIds),
  ]);

  const sessionsByClass = new Map<string, string[]>();
  for (const session of attendanceSessions ?? []) {
    const list = sessionsByClass.get(session.class_session_id) ?? [];
    list.push(session.id);
    sessionsByClass.set(session.class_session_id, list);
  }

  const classSessionByAttendanceSession = new Map<string, string>();
  for (const [classSessionId, sessionIdList] of sessionsByClass) {
    for (const attendanceSessionId of sessionIdList) {
      classSessionByAttendanceSession.set(attendanceSessionId, classSessionId);
    }
  }

  const attendedCountByEnrollmentAndClass = new Map<string, number>();
  for (const record of attendanceRecords ?? []) {
    const classSessionId = classSessionByAttendanceSession.get(record.attendance_session_id);
    if (!classSessionId) continue;
    const key = `${record.enrollment_id}:${classSessionId}`;
    attendedCountByEnrollmentAndClass.set(
      key,
      (attendedCountByEnrollmentAndClass.get(key) ?? 0) + 1
    );
  }

  const assignmentsByClass = new Map<string, typeof assignments>();
  for (const assignment of assignments ?? []) {
    const list = assignmentsByClass.get(assignment.class_session_id) ?? [];
    list.push(assignment);
    assignmentsByClass.set(assignment.class_session_id, list);
  }

  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const enrollmentIdSet = new Set(enrollmentIds);

  const { data: assignmentSubmissions } = assignmentIds.length
    ? await db
        .from("assignment_submissions")
        .select("id, enrollment_id, assignment_id")
        .in("assignment_id", assignmentIds)
        .in("enrollment_id", enrollmentIds)
    : { data: [] };

  const submissionIds = (assignmentSubmissions ?? []).map((s) => s.id);
  const { data: assignmentGrades } = submissionIds.length
    ? await db
        .from("assignment_grades")
        .select("assignment_submission_id, grade")
        .in("assignment_submission_id", submissionIds)
    : { data: [] };

  const gradeBySubmissionId = new Map<string, number | null>(
    (assignmentGrades ?? []).map((g) => [g.assignment_submission_id, (g.grade ?? null) as number | null])
  );

  const submissionsByEnrollment = new Map<string, typeof assignmentSubmissions>();
  for (const submission of assignmentSubmissions ?? []) {
    if (!enrollmentIdSet.has(submission.enrollment_id)) continue;
    const list = submissionsByEnrollment.get(submission.enrollment_id) ?? [];
    list.push(submission);
    submissionsByEnrollment.set(submission.enrollment_id, list);
  }

  const testsByEnrollment = new Map<string, typeof testScores>();
  for (const test of testScores ?? []) {
    const list = testsByEnrollment.get(test.enrollment_id) ?? [];
    list.push(test);
    testsByEnrollment.set(test.enrollment_id, list);
  }

  const classTestsBySession = new Map<string, typeof classTests>();
  for (const test of classTests ?? []) {
    const list = classTestsBySession.get(test.class_session_id) ?? [];
    list.push(test);
    classTestsBySession.set(test.class_session_id, list);
  }

  const courses: CourseAcademicOverview[] = [];

  for (const enrollment of enrollments) {
    const cs = classSessionById.get(enrollment.class_session_id) as {
      id: string;
      title: string;
      course_code: string;
      semester: SemesterType;
      academic_year: string;
    } | undefined;

    if (!cs) continue;

    const classSessionId = enrollment.class_session_id;
    const sessionIds = sessionsByClass.get(classSessionId) ?? [];
    const actualSessionCount = sessionIds.length;
    const attendedInClass =
      attendedCountByEnrollmentAndClass.get(`${enrollment.id}:${classSessionId}`) ?? 0;

    const classAssignments = assignmentsByClass.get(classSessionId) ?? [];
    const enrollmentSubmissions = submissionsByEnrollment.get(enrollment.id) ?? [];
    const submissionByAssignment = new Map(
      enrollmentSubmissions.map((s) => [s.assignment_id, s])
    );

    const assignmentScores: AssessmentScore[] = classAssignments.map((assignment, index) => {
      const submission = submissionByAssignment.get(assignment.id);
      const grade = submission?.id ? gradeBySubmissionId.get(submission.id) ?? null : null;
      const maxScore = Number(assignment.max_score ?? 100);

      return {
        label: `Assignment ${index + 1}`,
        title: assignment.title,
        score: grade,
        maxScore,
        percent:
          grade !== null && maxScore > 0 ? (grade / maxScore) * 100 : null,
      };
    });

    const sessionTests =
      (classTestsBySession.get(classSessionId) ?? []).filter(
        (t) => t.semester === cs.semester && t.academic_year === cs.academic_year
      ) ?? [];

    const enrollmentTestScores = testsByEnrollment.get(enrollment.id) ?? [];
    const testScoreItems: AssessmentScore[] = sessionTests.map((classTest) => {
      const record = enrollmentTestScores.find(
        (s) => s.class_test_id === classTest.id || s.test_number === classTest.test_number
      );
      const score = record ? Number(record.score) : null;
      const maxScore = Number(record?.max_score ?? classTest.max_score);

      const testLabel =
        sessionTests.length >= 2 ? `Test ${classTest.test_number}` : "Test";

      return {
        label: testLabel,
        title: classTest.title,
        score,
        maxScore,
        percent: score !== null && maxScore > 0 ? (score / maxScore) * 100 : null,
      };
    });

    const caConfig = (caConfigs ?? []).find(
      (c) =>
        c.class_session_id === classSessionId &&
        c.semester === cs.semester &&
        c.academic_year === cs.academic_year
    );

    const config = caConfig ?? {
      attendance_weight: 0,
      assignment_weight: 0,
      test_weight: 0,
      expected_class_count: null,
    };

    const attendanceClassTotal = resolveAttendanceClassTotal(
      config.expected_class_count,
      actualSessionCount
    );

    const courseCa = computeCourseCA(config, {
      attendedSessions: attendedInClass,
      totalSessions: attendanceClassTotal,
      hasAssignments: classAssignments.length > 0,
      assignmentGrades: assignmentScores.map((a) => ({
        grade: a.score,
        maxScore: a.maxScore,
      })),
      testScores: enrollmentTestScores.map((s) => ({
        test_number: s.test_number ?? 1,
        score: Number(s.score),
        max_score: Number(s.max_score),
        class_test_id: s.class_test_id ?? undefined,
      })),
      classTests: sessionTests.map((t) => ({
        id: t.id,
        test_number: t.test_number,
        max_score: t.max_score,
        weight_percent: t.weight_percent,
      })),
    });

    const assignmentVisible = classAssignments.slice(0, 2);
    const assignmentDisplays =
      assignmentVisible.length === 0
        ? ["-"]
        : assignmentVisible.map((assignment) => {
            const submission = submissionByAssignment.get(assignment.id);
            const grade = submission?.id ? gradeBySubmissionId.get(submission.id) ?? null : null;
            return grade !== null ? `${grade}/${Number(assignment.max_score)}` : "-";
          });

    courses.push({
      enrollmentId: enrollment.id,
      classSessionId,
      courseCode: cs.course_code,
      courseTitle: cs.title,
      semester: cs.semester,
      academicYear: cs.academic_year,
      studentName,
      collegeId: enrollment.college_id ?? collegeId,
      attendancePercent: courseCa.attendancePercent,
      totalAttended: attendedInClass,
      totalSessions: attendanceClassTotal,
      assignmentPercent: courseCa.assignmentPercent,
      assignmentDisplays,
      testCount: sessionTests.length,
      test1Display: courseCa.test1Display,
      test2Display: courseCa.test2Display,
      totalCADisplay: courseCa.totalCADisplay,
      caPercent: courseCa.caPercent,
      assignments: assignmentScores,
      tests: testScoreItems,
    });
  }

  return {
    studentName,
    collegeId,
    courses,
    submittedCount: assignmentSubmissions?.length ?? 0,
    totalAssignments: assignments?.length ?? 0,
  };
}
