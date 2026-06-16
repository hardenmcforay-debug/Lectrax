/** Shown in CA Structure inputs before a lecturer saves their first configuration. */
export const EMPTY_CA_WEIGHTS = {
  attendance: 0,
  assignment: 0,
  test: 0,
} as const;

/** @deprecated Use EMPTY_CA_WEIGHTS — kept for existing imports. */
export const DEFAULT_CA_WEIGHTS = EMPTY_CA_WEIGHTS;

/** Legacy DB column defaults before migration 043. */
const LEGACY_DEFAULT_CA_WEIGHTS = {
  attendance: 10,
  assignment: 10,
  test: 10,
} as const;

export type CAWeights = {
  attendance: number;
  assignment: number;
  test: number;
};

function toWeight(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isLegacyDefaultCaWeights(weights: CAWeights): boolean {
  return (
    weights.attendance === LEGACY_DEFAULT_CA_WEIGHTS.attendance &&
    weights.assignment === LEGACY_DEFAULT_CA_WEIGHTS.assignment &&
    weights.test === LEGACY_DEFAULT_CA_WEIGHTS.test
  );
}

/** Normalize weights loaded from storage for UI and calculations. */
export function resolveCaWeightsFromStorage(
  attendance: number | string | null | undefined,
  assignment: number | string | null | undefined,
  test: number | string | null | undefined
): CAWeights {
  const weights: CAWeights = {
    attendance: toWeight(attendance),
    assignment: toWeight(assignment),
    test: toWeight(test),
  };

  if (isLegacyDefaultCaWeights(weights)) {
    return { ...EMPTY_CA_WEIGHTS };
  }

  return weights;
}