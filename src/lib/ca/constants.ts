/** Shown in CA Structure inputs before a lecturer saves their first configuration. */
export const EMPTY_CA_WEIGHTS = {
  attendance: 0,
  assignment: 0,
  test: 0,
} as const;

/** @deprecated Use EMPTY_CA_WEIGHTS — kept for existing imports. */
export const DEFAULT_CA_WEIGHTS = EMPTY_CA_WEIGHTS;

export type CAWeights = {
  attendance: number;
  assignment: number;
  test: number;
};

function toWeight(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Parse CA weights stored in ca_configurations for UI and calculations. */
export function parseCaWeights(
  attendance: number | string | null | undefined,
  assignment: number | string | null | undefined,
  test: number | string | null | undefined
): CAWeights {
  return {
    attendance: toWeight(attendance),
    assignment: toWeight(assignment),
    test: toWeight(test),
  };
}

/** @deprecated Use parseCaWeights */
export function resolveCaWeightsFromStorage(
  attendance: number | string | null | undefined,
  assignment: number | string | null | undefined,
  test: number | string | null | undefined
): CAWeights {
  return parseCaWeights(attendance, assignment, test);
}