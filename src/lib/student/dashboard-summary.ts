import { getStudentAcademicOverview } from "@/lib/student/academic-overview";
import type { CourseAcademicOverview } from "@/lib/student/academic-overview";

export type StudentDashboardSummary = {
  studentName: string;
  collegeId: string | null;
  courses: Pick<
    CourseAcademicOverview,
    | "enrollmentId"
    | "courseCode"
    | "courseTitle"
    | "totalCADisplay"
    | "classSessionId"
  >[];
  submittedCount: number;
  totalAssignments: number;
};

export async function getStudentDashboardSummary(
  studentId: string
): Promise<StudentDashboardSummary | null> {
  const academic = await getStudentAcademicOverview(studentId);
  if (!academic) return null;

  return {
    studentName: academic.studentName,
    collegeId: academic.collegeId,
    courses: academic.courses.map((course) => ({
      enrollmentId: course.enrollmentId,
      classSessionId: course.classSessionId,
      courseCode: course.courseCode,
      courseTitle: course.courseTitle,
      totalCADisplay: course.totalCADisplay,
    })),
    submittedCount: academic.submittedCount,
    totalAssignments: academic.totalAssignments,
  };
}
