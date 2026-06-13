export function normalizeGradeInput(value: string): string {
  return value.trim();
}

export function countDirtyGrades(
  enrollmentIds: string[],
  current: Record<string, string>,
  saved: Record<string, string>
): number {
  let count = 0;
  for (const id of enrollmentIds) {
    if (normalizeGradeInput(current[id] ?? "") !== normalizeGradeInput(saved[id] ?? "")) {
      count += 1;
    }
  }
  return count;
}

export function unsavedGradesLabel(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? "1 unsaved change" : `${count} unsaved changes`;
}

export interface GradeSavePayload {
  scores: { enrollmentId: string; score: number }[];
  deleteEnrollmentIds: string[];
}

export function buildGradeSavePayload(
  enrollmentIds: string[],
  current: Record<string, string>,
  saved: Record<string, string>,
  maxScore: number
): { payload: GradeSavePayload | null; error: string | null } {
  const scores: { enrollmentId: string; score: number }[] = [];
  const deleteEnrollmentIds: string[] = [];

  for (const enrollmentId of enrollmentIds) {
    const currentRaw = normalizeGradeInput(current[enrollmentId] ?? "");
    const savedRaw = normalizeGradeInput(saved[enrollmentId] ?? "");

    if (currentRaw === savedRaw) continue;

    if (currentRaw === "") {
      if (savedRaw !== "") {
        deleteEnrollmentIds.push(enrollmentId);
      }
      continue;
    }

    const score = Number(currentRaw);
    if (Number.isNaN(score)) {
      return { payload: null, error: "Enter valid numbers for all modified scores." };
    }
    if (score < 0 || score > maxScore) {
      return {
        payload: null,
        error: `All scores must be between 0 and ${maxScore}.`,
      };
    }
    scores.push({ enrollmentId, score });
  }

  if (scores.length === 0 && deleteEnrollmentIds.length === 0) {
    return { payload: null, error: null };
  }

  return { payload: { scores, deleteEnrollmentIds }, error: null };
}
