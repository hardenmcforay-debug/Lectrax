import { getSingleTestCellValue, getTestColumnLayout } from "@/lib/ca/test-columns";
import type { StudentTableRow } from "@/types/database";

/** Column headers matching the lecturer student performance table. */
export function getStudentPerformanceColumnHeaders(
  assignmentCount: number,
  testCount: number
): string[] {
  const headers = ["No.", "Name", "College ID", "Attendance %", "Total Classes Attended"];

  if (assignmentCount <= 1) {
    headers.push("Assignment");
  } else {
    headers.push("Assignment 1", "Assignment 2");
  }

  const testLayout = getTestColumnLayout(testCount);
  if (testLayout === "split") {
    headers.push("Test 1", "Test 2");
  } else {
    headers.push("Test");
  }

  headers.push("Total C.A");
  return headers;
}

export type StudentPerformanceExportCell = string | number | null;

/** Row values as displayed in the table (for export). */
export function getStudentPerformanceRowValues(
  row: StudentTableRow,
  index: number,
  assignmentCount: number,
  testCount: number
): StudentPerformanceExportCell[] {
  const values: StudentPerformanceExportCell[] = [
    index + 1,
    row.name,
    row.collegeId ?? "—",
    row.attendancePercentage / 100,
    `${row.totalAttendance}/${row.totalSessions}`,
  ];

  if (assignmentCount <= 1) {
    values.push(row.assignmentDisplays[0] ?? "-");
  } else {
    values.push(row.assignmentDisplays[0] ?? "-", row.assignmentDisplays[1] ?? "-");
  }

  const testLayout = getTestColumnLayout(testCount);
  if (testLayout === "split") {
    values.push(row.test1Display, row.test2Display);
  } else {
    values.push(getSingleTestCellValue(testLayout, row.test1Display));
  }

  values.push(row.totalCADisplay);
  return values;
}

/** Attendance % column index (0-based) for Excel number formatting. */
export function getAttendancePercentColumnIndex(): number {
  return 3;
}
