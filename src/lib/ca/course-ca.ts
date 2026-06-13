import {
  averageAssignmentGrades,
  calculateCA,
  scoreToPercent,
  type TestScoreInput,
} from "@/lib/ca-calculator";
import type { CAConfiguration, ClassTest } from "@/types/database";

/** Use lecturer-configured expected classes, or fall back to sessions actually held. */
export function resolveAttendanceClassTotal(
  expectedClassCount: number | null | undefined,
  actualSessionCount: number
): number {
  if (expectedClassCount != null && expectedClassCount > 0) {
    return expectedClassCount;
  }
  return actualSessionCount;
}

export interface TestScoreRecord {
  test_number: number;
  score: number;
  max_score: number;
  class_test_id?: string;
}

export interface CourseCAInput {
  attendedSessions: number;
  totalSessions: number;
  assignmentGrades: { grade: number | null; maxScore: number }[];
  testScores: TestScoreRecord[];
  classTests: Pick<ClassTest, "id" | "test_number" | "max_score" | "weight_percent">[];
  hasAssignments?: boolean;
}

export interface CourseCAResult {
  attendancePercent: number;
  assignmentPercent: number | null;
  assignmentDisplay: string;
  test1Display: string;
  test2Display: string;
  totalCADisplay: string;
  totalCAEarned: number;
  totalCAMax: number;
  caPercent: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatPoints(earned: number, max: number): string {
  if (max <= 0) return "—";
  const e = Number.isInteger(earned) ? String(earned) : earned.toFixed(1);
  const m = Number.isInteger(max) ? String(max) : max.toFixed(1);
  return `${e}/${m}`;
}

function assignmentAggregate(grades: { grade: number | null; maxScore: number }[]) {
  const graded = grades.filter((g) => g.grade !== null);
  if (graded.length === 0) {
    return { display: "—", earned: 0, max: 0, percent: null as number | null };
  }
  const earned = graded.reduce((sum, g) => sum + Number(g.grade), 0);
  const max = graded.reduce((sum, g) => sum + Number(g.maxScore), 0);
  const percent = max > 0 ? (earned / max) * 100 : null;
  return { display: formatPoints(earned, max), earned, max, percent };
}

function formatTestDisplay(
  testNumber: 1 | 2,
  scores: TestScoreRecord[],
  tests: CourseCAInput["classTests"]
): string {
  const testDef = tests.find((t) => t.test_number === testNumber);
  if (!testDef) return "-";

  const record = scores.find(
    (s) => s.test_number === testNumber || s.class_test_id === testDef.id
  );
  if (!record) return "—";

  return formatPoints(Number(record.score), Number(record.max_score));
}

function buildTestInputs(
  classTests: CourseCAInput["classTests"],
  testScores: TestScoreRecord[]
): TestScoreInput[] {
  return [...classTests]
    .sort((a, b) => a.test_number - b.test_number)
    .map((test) => {
      const record = testScores.find(
        (s) => s.test_number === test.test_number || s.class_test_id === test.id
      );
      return {
        percent: record
          ? scoreToPercent(Number(record.score), Number(record.max_score))
          : null,
        weightPercent: test.weight_percent ?? null,
      };
    });
}

/**
 * Total C.A uses saved CA weights (attendance + assignment + test %).
 * Earned points come from weighted contributions; max is the sum of configured weights.
 */
export function computeCourseCA(
  config: Pick<
    CAConfiguration,
    "attendance_weight" | "assignment_weight" | "test_weight" | "expected_class_count"
  >,
  input: CourseCAInput
): CourseCAResult {
  const attendanceWeight = Number(config.attendance_weight);
  const assignmentWeight = Number(config.assignment_weight);
  const testWeight = Number(config.test_weight);

  const attendancePercent =
    input.totalSessions > 0
      ? (input.attendedSessions / input.totalSessions) * 100
      : 0;

  const assignment = assignmentAggregate(input.assignmentGrades);
  const assignmentPercent = averageAssignmentGrades(input.assignmentGrades);

  const testInputs = buildTestInputs(input.classTests, input.testScores);

  const ca = calculateCA(config, {
    attendedSessions: input.attendedSessions,
    totalSessions: input.totalSessions,
    assignmentScorePercent: assignmentPercent,
    tests: testInputs.length > 0 ? testInputs : undefined,
  });

  const totalCAEarned = round1(ca.totalCA);
  const totalCAMax = round1(attendanceWeight + assignmentWeight + testWeight);

  const caPercent = totalCAMax > 0 ? (totalCAEarned / totalCAMax) * 100 : 0;

  return {
    attendancePercent,
    assignmentPercent,
    assignmentDisplay: assignment.display,
    test1Display: formatTestDisplay(1, input.testScores, input.classTests),
    test2Display: formatTestDisplay(2, input.testScores, input.classTests),
    totalCADisplay: totalCAMax > 0 ? formatPoints(totalCAEarned, totalCAMax) : "—",
    totalCAEarned,
    totalCAMax,
    caPercent,
  };
}
