import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { getStudentAssignmentsList } from "@/lib/student/assignment-queries";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StudentAssignmentsList } from "@/components/student/student-assignments-list";

export const dynamic = "force-dynamic";

export default async function StudentAssignmentsPage() {
  const user = await requireAuthenticatedUser();

  const assignments = await getStudentAssignmentsList(user.id);

  return (
    <DashboardShell
      role="student"
      title="Assignments"
      description="View deadlines and submit your work"
    >
      <StudentAssignmentsList assignments={assignments} />
    </DashboardShell>
  );
}
