/** How many class tests exist for a course (max 2). */
export type TestColumnLayout = "none" | "single" | "split";

export function getTestColumnLayout(testCount: number): TestColumnLayout {
  if (testCount >= 2) return "split";
  if (testCount === 1) return "single";
  return "none";
}

/** Cell value for the single "Test" column (0 or 1 test). */
export function getSingleTestCellValue(
  layout: TestColumnLayout,
  test1Display: string
): string {
  if (layout === "none") return "-";
  return test1Display;
}

export function getCreateTestButtonLabel(nextTestNumber: 1 | 2 | null): string {
  if (nextTestNumber === 2) return "Create Test 2";
  return "Create Test";
}

export function getCreateTestDialogTitle(nextTestNumber: 1 | 2 | null): string {
  if (nextTestNumber === 2) return "Create Test 2";
  if (nextTestNumber === 1) return "Create Test";
  return "Create Test";
}

export function getDefaultTestTitle(nextTestNumber: 1 | 2): string {
  return nextTestNumber === 2 ? "Test 2" : "Test";
}

/** Next test slot from server-known count (no client fetch). */
export function getNextTestNumber(testCount: number): 1 | 2 | null {
  if (testCount <= 0) return 1;
  if (testCount === 1) return 2;
  return null;
}
