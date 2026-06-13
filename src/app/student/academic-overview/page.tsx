import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AcademicOverviewView } from "@/components/student/academic-overview-view";
import { getCachedStudentAcademicOverview } from "@/lib/auth/cached-queries";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { DataFetchError } from "@/components/errors/data-fetch-error";

export default async function StudentAcademicOverviewPage() {
  const user = await requireAuthenticatedUser();
  const data = await getCachedStudentAcademicOverview(user.id);

  if (!data) {
    return (
      <DashboardShell
        role="student"
        title="Academic Overview"
        description="View your attendance and continuous assessment performance across all your class sessions."
      >
        <DataFetchError />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role="student"
      title="Academic Overview"
      description="View your attendance and continuous assessment performance across all your class sessions."
    >
      <AcademicOverviewView data={data} />
    </DashboardShell>
  );
}
