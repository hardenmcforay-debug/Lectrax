import type { ClassSession, SemesterType } from "@/types/database";
import type { StudentTableRow } from "@/types/database";
import {
  getAttendancePercentColumnIndex,
  getStudentPerformanceColumnHeaders,
  getStudentPerformanceRowValues,
} from "@/lib/lecturer/student-performance-columns";
import "server-only";

import ExcelJS from "exceljs";
import type { Alignment, Borders, Fill, Font } from "exceljs";

export interface StudentPerformanceExportMeta {
  session: Pick<ClassSession, "course_code" | "title" | "class_name" | "academic_year">;
  semester: SemesterType;
}

const REPORT_TITLE = "LECTRAX STUDENT PERFORMANCE REPORT";

const thinBorder: Partial<Borders> = {
  top: { style: "thin", color: { argb: "FF94A3B8" } },
  left: { style: "thin", color: { argb: "FF94A3B8" } },
  bottom: { style: "thin", color: { argb: "FF94A3B8" } },
  right: { style: "thin", color: { argb: "FF94A3B8" } },
};

const headerFill: Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E3A5F" },
};

function semesterFileLabel(semester: SemesterType): string {
  switch (semester) {
    case "first_semester":
      return "Sem1";
    case "second_semester":
      return "Sem2";
    case "full_year":
      return "FullYear";
  }
}

function sanitizeFileSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildStudentPerformanceFileName(
  session: Pick<ClassSession, "course_code" | "academic_year">,
  semester: SemesterType
): string {
  const course = sanitizeFileSegment(session.course_code);
  const sem = semesterFileLabel(semester);
  const year = sanitizeFileSegment(session.academic_year);
  return `${course}_${sem}_${year}_StudentPerformance.xlsx`;
}

function fullCourseLabel(
  session: Pick<ClassSession, "course_code" | "title">
): string {
  return `${session.course_code} - ${session.title}`;
}

function setMergedCenteredRow(
  worksheet: ExcelJS.Worksheet,
  rowIndex: number,
  colCount: number,
  value: string,
  font: Partial<Font>
) {
  worksheet.mergeCells(rowIndex, 1, rowIndex, colCount);
  const cell = worksheet.getCell(rowIndex, 1);
  cell.value = value;
  cell.font = font;
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

function applyCellStyle(
  cell: ExcelJS.Cell,
  options: {
    bold?: boolean;
    horizontal?: Alignment["horizontal"];
    numFmt?: string;
    fill?: Fill;
    fontColor?: string;
    fontSize?: number;
  }
) {
  cell.alignment = {
    horizontal: options.horizontal ?? "center",
    vertical: "middle",
    wrapText: true,
  };
  cell.border = thinBorder;

  const font: Partial<Font> = {
    size: options.fontSize ?? 11,
  };
  if (options.bold) font.bold = true;
  if (options.fontColor) font.color = { argb: options.fontColor };
  cell.font = font;

  if (options.numFmt) cell.numFmt = options.numFmt;
  if (options.fill) cell.fill = options.fill;
}

function autoSizeColumns(
  worksheet: ExcelJS.Worksheet,
  columnCount: number,
  startRow: number
) {
  for (let col = 1; col <= columnCount; col++) {
    let maxLength = 12;
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber < startRow) return;
      const cell = row.getCell(col);
      const text = cell.text ?? String(cell.value ?? "");
      maxLength = Math.max(maxLength, text.length);
    });
    worksheet.getColumn(col).width = Math.min(Math.max(maxLength + 2, 10), 42);
  }
}

export async function exportStudentPerformanceWorkbook(params: {
  rows: StudentTableRow[];
  assignmentCount: number;
  testCount: number;
  meta: StudentPerformanceExportMeta;
}): Promise<{ buffer: ArrayBuffer; fileName: string }> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Student Performance");

  const { session, semester } = params.meta;
  const headers = getStudentPerformanceColumnHeaders(
    params.assignmentCount,
    params.testCount
  );
  const columnCount = headers.length;
  const totalCaColIndex = columnCount;
  const attendanceColIndex = getAttendancePercentColumnIndex() + 1;

  const titleRow = 1;
  const courseRow = 2;
  const yearRow = session.class_name ? 4 : 3;
  const headerRowIndex = yearRow + 2;
  const dataStartRow = headerRowIndex + 1;

  setMergedCenteredRow(worksheet, titleRow, columnCount, REPORT_TITLE, {
    bold: true,
    size: 16,
    color: { argb: "FF1E3A5F" },
  });
  worksheet.getRow(titleRow).height = 28;

  setMergedCenteredRow(
    worksheet,
    courseRow,
    columnCount,
    `Course: ${fullCourseLabel(session)}`,
    { bold: true, size: 12 }
  );
  worksheet.getRow(courseRow).height = 22;

  if (session.class_name) {
    const classRow = 3;
    setMergedCenteredRow(
      worksheet,
      classRow,
      columnCount,
      `Class: ${session.class_name}`,
      { bold: true, size: 12 }
    );
    worksheet.getRow(classRow).height = 22;
  }

  setMergedCenteredRow(
    worksheet,
    yearRow,
    columnCount,
    `Academic Year: ${session.academic_year}`,
    { bold: true, size: 12 }
  );
  worksheet.getRow(yearRow).height = 22;

  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.height = 24;
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    applyCellStyle(cell, {
      bold: true,
      horizontal: "center",
      fill: headerFill,
      fontColor: "FFFFFFFF",
    });
  });

  params.rows.forEach((row, index) => {
    const values = getStudentPerformanceRowValues(
      row,
      index,
      params.assignmentCount,
      params.testCount
    );
    const excelRow = worksheet.getRow(dataStartRow + index);
    excelRow.height = 20;

    values.forEach((value, colIndex) => {
      const col = colIndex + 1;
      const cell = excelRow.getCell(col);
      cell.value = value;

      const isName = col === 2;
      const isCollegeId = col === 3;
      const isTotalCa = col === totalCaColIndex;
      const isAttendance = col === attendanceColIndex;

      applyCellStyle(cell, {
        bold: isTotalCa,
        horizontal: isName || isCollegeId ? "left" : "center",
        numFmt: isAttendance && typeof value === "number" ? "0.0%" : undefined,
        fontColor: isTotalCa ? "FF1E3A5F" : undefined,
        fontSize: isTotalCa ? 11 : 11,
      });
    });
  });

  autoSizeColumns(worksheet, columnCount, headerRowIndex);

  worksheet.views = [
    {
      state: "frozen",
      ySplit: headerRowIndex,
      activeCell: `A${dataStartRow}`,
    },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = buildStudentPerformanceFileName(session, semester);

  return { buffer, fileName };
}
