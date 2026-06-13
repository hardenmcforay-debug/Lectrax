/** Shown in CA Structure inputs before a lecturer saves their first configuration. */
export const EMPTY_CA_WEIGHTS = {
  attendance: 0,
  assignment: 0,
  test: 0,
} as const;

/** Suggested weights when a lecturer uses Reset in the CA Structure panel. */
export const DEFAULT_CA_WEIGHTS = {
  attendance: 10,
  assignment: 10,
  test: 10,
} as const;

export type CAWeights = {
  attendance: number;
  assignment: number;
  test: number;
};
