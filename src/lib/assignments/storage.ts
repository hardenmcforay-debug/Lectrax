import type { SemesterType } from "@/types/database";

export const ASSIGNMENT_SUBMISSIONS_BUCKET = "assignment-submissions";
export const MAX_SUBMISSION_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_SUBMISSION_MIME = "application/pdf";

export function semesterStorageLabel(semester: SemesterType): string {
  switch (semester) {
    case "first_semester":
      return "Semester-1";
    case "second_semester":
      return "Semester-2";
    case "full_year":
      return "Full-Year";
  }
}

export function sanitizePathSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildSubmissionStoragePath(params: {
  academicYear: string;
  semester: SemesterType;
  courseCode: string;
  assignmentId: string;
  studentId: string;
}): string {
  const year = sanitizePathSegment(params.academicYear);
  const semester = sanitizePathSegment(semesterStorageLabel(params.semester));
  const course = sanitizePathSegment(params.courseCode);
  const assignment = sanitizePathSegment(params.assignmentId);
  const student = sanitizePathSegment(params.studentId);

  return `${year}/${semester}/${course}/${assignment}/${student}.pdf`;
}

export function isPdfFile(file: { type: string; name: string }): boolean {
  const name = file.name.toLowerCase();
  const blockedExtensions = [".jpg", ".jpeg", ".png", ".zip", ".rar", ".mp4"];
  if (blockedExtensions.some((ext) => name.endsWith(ext))) {
    return false;
  }
  return file.type === ALLOWED_SUBMISSION_MIME || name.endsWith(".pdf");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
