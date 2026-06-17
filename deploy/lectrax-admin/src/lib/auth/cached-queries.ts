import { cache } from "react";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getStudentAcademicOverview } from "@/lib/student/academic-overview";
import { getStudentDashboardSummary } from "@/lib/student/dashboard-summary";
import type { Profile } from "@/types/database";
import type { StudentAcademicOverview } from "@/lib/student/academic-overview";
import type { StudentDashboardSummary } from "@/lib/student/dashboard-summary";

export const getCachedProfileByUserId = cache(
  async (userId: string): Promise<Profile | null> => getProfileByUserId(userId)
);

export const getCachedStudentAcademicOverview = cache(
  async (studentId: string): Promise<StudentAcademicOverview | null> =>
    getStudentAcademicOverview(studentId)
);

export const getCachedStudentDashboardSummary = cache(
  async (studentId: string): Promise<StudentDashboardSummary | null> =>
    getStudentDashboardSummary(studentId)
);
