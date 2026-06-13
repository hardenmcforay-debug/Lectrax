import type { CAConfiguration } from "@/types/database";

export interface TestScoreInput {
  /** Normalized score as 0–100 percent */
  percent: number | null;
  /** Optional per-test weight; when set, scales within total test_weight */
  weightPercent?: number | null;
}

export interface CAInputs {
  attendedSessions: number;
  totalSessions: number;
  assignmentScorePercent: number | null;
  /** @deprecated Use `tests` for multiple tests */
  testScorePercent?: number | null;
  tests?: TestScoreInput[];
}

export interface CAResult {
  attendanceContribution: number;
  assignmentContribution: number;
  testContribution: number;
  totalCA: number;
  attendanceRawPercent: number;
}

export function calculateAttendanceContribution(
  attended: number,
  total: number,
  weight: number
): { contribution: number; rawPercent: number } {
  if (total === 0) return { contribution: 0, rawPercent: 0 };
  const rawPercent = (attended / total) * 100;
  const contribution = (attended / total) * weight;
  return { contribution, rawPercent };
}

/** Sum test contributions from one or more recorded tests. */
export function calculateTestsContribution(
  tests: TestScoreInput[],
  totalTestWeight: number
): number {
  const withScores = tests.filter((t) => t.percent !== null);
  if (withScores.length === 0) return 0;

  const explicitWeights = withScores.filter(
    (t) => t.weightPercent != null && Number(t.weightPercent) > 0
  );

  if (explicitWeights.length > 0) {
    const weightSum = explicitWeights.reduce(
      (sum, t) => sum + Number(t.weightPercent),
      0
    );
    const scale =
      weightSum > 0 ? totalTestWeight / weightSum : totalTestWeight / withScores.length;

    return withScores.reduce((sum, t) => {
      const w =
        t.weightPercent != null && Number(t.weightPercent) > 0
          ? Number(t.weightPercent) * scale
          : (totalTestWeight / withScores.length);
      return sum + ((t.percent ?? 0) / 100) * w;
    }, 0);
  }

  const perTestWeight = totalTestWeight / withScores.length;
  return withScores.reduce(
    (sum, t) => sum + ((t.percent ?? 0) / 100) * perTestWeight,
    0
  );
}

export function calculateCA(
  config: Pick<CAConfiguration, "attendance_weight" | "assignment_weight" | "test_weight">,
  inputs: CAInputs
): CAResult {
  const { contribution: attendanceContribution, rawPercent: attendanceRawPercent } =
    calculateAttendanceContribution(
      inputs.attendedSessions,
      inputs.totalSessions,
      Number(config.attendance_weight)
    );

  const assignmentContribution =
    inputs.assignmentScorePercent !== null
      ? (inputs.assignmentScorePercent / 100) * Number(config.assignment_weight)
      : 0;

  let testContribution = 0;
  if (inputs.tests && inputs.tests.length > 0) {
    testContribution = calculateTestsContribution(
      inputs.tests,
      Number(config.test_weight)
    );
  } else if (inputs.testScorePercent !== null && inputs.testScorePercent !== undefined) {
    testContribution =
      (inputs.testScorePercent / 100) * Number(config.test_weight);
  }

  const totalCA = attendanceContribution + assignmentContribution + testContribution;

  return {
    attendanceContribution,
    assignmentContribution,
    testContribution,
    totalCA,
    attendanceRawPercent,
  };
}

export function averageAssignmentGrades(
  grades: { grade: number | null; maxScore: number }[]
): number | null {
  const valid = grades.filter((g) => g.grade !== null);
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, g) => acc + ((g.grade! / g.maxScore) * 100), 0);
  return sum / valid.length;
}

export function scoreToPercent(score: number | null, maxScore: number): number | null {
  if (score === null || maxScore <= 0) return null;
  return (score / maxScore) * 100;
}
