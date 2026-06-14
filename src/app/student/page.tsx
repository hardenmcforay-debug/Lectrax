import {
  getCachedProfileByUserId,
  getCachedStudentDashboardSummary,
} from "@/lib/auth/cached-queries";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { OfflineCacheWriter } from "@/components/errors/offline-cache-writer";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { ClassCAPerSessionCard } from "@/components/student/class-ca-per-session-card";
import { MyClassesCard } from "@/components/student/my-classes-card";
import { StudentDashboardHero } from "@/components/student/student-dashboard-hero";
import {
  studentDashboardCardClass,
  studentDashboardCardHeadingClass,
} from "@/components/student/student-dashboard-styles";
import { BookOpen, FileText } from "lucide-react";
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
      <div className="portal-stat-grid">
        <StatCard
          title="Enrolled Classes"
          value={courses.length}
          icon={BookOpen}
          className={studentDashboardCardClass}
          titleClassName={studentDashboardCardHeadingClass}
        />
        <StatCard
          title="Assignment Submissions"
          value={submittedCount}
          icon={FileText}
          subtitle={
            totalAssignments > 0
              ? `${submittedCount} of ${totalAssignments} submitted`
              : "No assignments yet"
          }
          className={studentDashboardCardClass}
          titleClassName={studentDashboardCardHeadingClass}
        />
        <ClassCAPerSessionCard courses={courses} />
      </div>
      <MyClassesCard courses={courses} />
    </DashboardShell>
  );
}
