import { createServiceClient } from "@/lib/supabase/server";
import type { ClassSession, ClassTest, SemesterType } from "@/types/database";

export interface TestGradeRow {
  enrollmentId: string;
  name: string;
  collegeId: string | null;
  isManual: boolean;
  score: number | null;
}

export interface TestGradeEntryData {
  test: ClassTest;
  session: Pick<ClassSession, "id" | "course_code" | "title" | "class_name" | "semester" | "academic_year">;
  rows: TestGradeRow[];
}

export async function getClassTestsForSession(
  classSessionId: string,
  semester: SemesterType,
  academicYear: string,
  lecturerId: string
): Promise<ClassTest[]> {
  const supabase = await createServiceClient();

  const { data: session } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("id", classSessionId)
    .eq("lecturer_id", lecturerId)
    .maybeSingle();

  if (!session) return [];

  const { data } = await supabase
    .from("class_tests")
    .select("*")
    .eq("class_session_id", classSessionId)
    .eq("semester", semester)
    .eq("academic_year", academicYear)
    .order("test_number", { ascending: true });

  return (data ?? []) as ClassTest[];
}

export async function getClassTestForLecturer(
  classTestId: string,
  lecturerId: string
): Promise<ClassTest | null> {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from("class_tests")
    .select("*")
    .eq("id", classTestId)
    .eq("lecturer_id", lecturerId)
    .maybeSingle();

  return data as ClassTest | null;
}

export async function getTestGradeEntryData(
  classTestId: string,
  lecturerId: string
): Promise<TestGradeEntryData | null> {
  const supabase = await createServiceClient();
  const test = await getClassTestForLecturer(classTestId, lecturerId);
  if (!test) return null;

  const { data: session } = await supabase
    .from("class_sessions")
    .select("id, course_code, title, class_name, semester, academic_year")
    .eq("id", test.class_session_id)
    .single();

  if (!session) return null;

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, is_manual, college_id, profiles(full_name, college_id), manual_students(full_name, college_id)")
    .eq("class_session_id", test.class_session_id)
    .order("joined_at", { ascending: true });

  const { data: scores } = await supabase
    .from("test_scores")
    .select("enrollment_id, score")
    .eq("class_test_id", classTestId);

  const scoreByEnrollment = new Map(
    (scores ?? []).map((s) => [s.enrollment_id, Number(s.score)])
  );

  const rows: TestGradeRow[] = (enrollments ?? []).map((e) => {
    const manual = e.manual_students as unknown as { full_name: string; college_id: string | null } | null;
    const profile = e.profiles as unknown as { full_name: string; college_id: string | null } | null;
    const name = e.is_manual ? manual?.full_name : profile?.full_name;
    const collegeId = e.college_id ?? (e.is_manual ? manual?.college_id : profile?.college_id);

    return {
      enrollmentId: e.id,
      name: name ?? "Unknown",
      collegeId: collegeId ?? null,
      isManual: e.is_manual,
      score: scoreByEnrollment.get(e.id) ?? null,
    };
  });

  return {
    test: test as ClassTest,
    session: session as TestGradeEntryData["session"],
    rows,
  };
}

export interface DeleteClassTestResult {
  deletedTestId: string;
  renumberedRemainingTest: boolean;
}

/** Delete a class test, cascade scores, and renumber Test 2 → Test 1 when Test 1 is removed. */
export async function deleteClassTest(
  classTestId: string,
  lecturerId: string
): Promise<DeleteClassTestResult | null> {
  const supabase = await createServiceClient();
  const test = await getClassTestForLecturer(classTestId, lecturerId);
  if (!test) return null;

  const { data: siblings } = await supabase
    .from("class_tests")
    .select("id, test_number, title")
    .eq("class_session_id", test.class_session_id)
    .eq("semester", test.semester)
    .eq("academic_year", test.academic_year);

  const remainingTest2 = (siblings ?? []).find(
    (t) => t.id !== test.id && t.test_number === 2
  );
  const shouldRenumberTest2 =
    test.test_number === 1 && remainingTest2 !== undefined;

  const { error: deleteError } = await supabase
    .from("class_tests")
    .delete()
    .eq("id", classTestId)
    .eq("lecturer_id", lecturerId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (shouldRenumberTest2 && remainingTest2) {
    const normalizedTitle =
      remainingTest2.title === "Test 2" ? "Test" : remainingTest2.title;

    const { error: promoteError } = await supabase
      .from("class_tests")
      .update({
        test_number: 1,
        title: normalizedTitle,
      })
      .eq("id", remainingTest2.id);

    if (promoteError) {
      throw new Error(promoteError.message);
    }

    await supabase
      .from("test_scores")
      .update({
        test_number: 1,
        title: normalizedTitle,
      })
      .eq("class_test_id", remainingTest2.id);
  }

  return {
    deletedTestId: classTestId,
    renumberedRemainingTest: shouldRenumberTest2,
  };
}

export async function getNextTestNumber(
  classSessionId: string,
  semester: SemesterType,
  academicYear: string
): Promise<1 | 2 | null> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("class_tests")
    .select("test_number")
    .eq("class_session_id", classSessionId)
    .eq("semester", semester)
    .eq("academic_year", academicYear);

  const numbers = new Set((data ?? []).map((t) => t.test_number));
  if (!numbers.has(1)) return 1;
  if (!numbers.has(2)) return 2;
  return null;
}
