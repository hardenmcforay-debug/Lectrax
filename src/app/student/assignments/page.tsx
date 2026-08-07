import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { getStudentAssignmentsList } from "@/lib/student/assignment-queries";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StudentAssignmentsList } from "@/components/student/student-assignments-list";
import { TablePagination } from "@/components/shared/table-pagination";
import { clampPage, clampPageSize } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function StudentAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const user = await requireAuthenticatedUser();
  const params = await searchParams;
  const page = clampPage(Number(params.page ?? undefined));
  const pageSize = clampPageSize(Number(params.pageSize ?? undefined));

  const { assignments, total } = await getStudentAssignmentsList(user.id, {
    page,
    pageSize,
  });

  return (
    <DashboardShell
      role="student"
      title="Assignments"
      description="View deadlines and submit your work"
    >
      <div className="mb-4">
        <TablePagination
          basePath="/student/assignments"
          page={page}
          pageSize={pageSize}
          total={total}
        />
      </div>
      <StudentAssignmentsList assignments={assignments} total={total} pageSize={pageSize} />
    </DashboardShell>
  );
}
