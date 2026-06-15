import {
  getCachedProfileByUserId,
  getCachedStudentDashboardSummary,
} from "@/lib/auth/cached-queries";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { OfflineCacheWriter } from "@/components/errors/offline-cache-writer";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StudentDashboardBody } from "@/components/student/student-dashboard-body";
import { StudentDashboardHero } from "@/components/student/student-dashboard-hero";
import { getDisplayName } from "@/lib/auth/display-name";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const user = await requireAuthenticatedUser();
  const profile = await getCachedProfileByUserId(user.id);
  const overview = await getCachedStudentDashboardSummary(user.id);
  const courses = overview?.courses ?? [];
  const submittedCount = overview?.submittedCount ?? 0;
  const totalAssignments = overview?.totalAssignments ?? 0;
  const displayName = getDisplayName(user, profile);

  return (
    <DashboardShell role="student" headerVariant="hidden">
      <OfflineCacheWriter cacheKey="profile" data={profile} />
      <OfflineCacheWriter cacheKey="dashboard-summary" data={overview} />
      <StudentDashboardHero
        displayName={displayName}
        collegeId={profile?.college_id ?? null}
      />
      <StudentDashboardBody
        courses={courses}
        submittedCount={submittedCount}
        totalAssignments={totalAssignments}
      />
    </DashboardShell>
  );
}
