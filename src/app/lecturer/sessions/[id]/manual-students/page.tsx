import { notFound } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { BackLink } from "@/components/ui/back-link";
import { TablePagination } from "@/components/shared/table-pagination";
import { ManualStudentsManager } from "@/components/lecturer/manual-students-manager";
import { getManualStudentsForSession } from "@/lib/lecturer/manual-students";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import {
  isSubscriptionWritable,
  refreshSubscriptionLifecycle,
} from "@/lib/subscription";
import { PAGINATION, clampPage } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function ManualStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = clampPage(Number(sp.page ?? undefined));
  const user = await requireAuthenticatedUser();

  const session = await getClassSessionForLecturer(id, user.id);
  if (!session) notFound();

  const [{ students, total }, subscription] = await Promise.all([
    getManualStudentsForSession(id, user.id, {
      page,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    }),
    refreshSubscriptionLifecycle(user.id),
  ]);

  const canWrite = isSubscriptionWritable(subscription);

  const courseLabel = session.class_name
    ? `${session.course_code} — ${session.class_name}`
    : `${session.course_code} — ${session.title}`;

  return (
    <DashboardShell
      role="lecturer"
      title="Manual Students"
      description={`Update college IDs for manually added students in ${courseLabel}.`}
    >
      <div className="mb-4">
        <BackLink href={`/lecturer/sessions/${id}?tab=students`} />
      </div>
      <div className="mb-4">
        <TablePagination
          basePath={`/lecturer/sessions/${id}/manual-students`}
          page={page}
          pageSize={PAGINATION.DEFAULT_PAGE_SIZE}
          total={total}
        />
      </div>
      <ManualStudentsManager
        sessionId={id}
        initialStudents={students}
        canWrite={canWrite}
      />
    </DashboardShell>
  );
}
