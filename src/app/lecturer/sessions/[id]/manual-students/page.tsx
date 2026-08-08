import { notFound } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { BackLink } from "@/components/ui/back-link";
import { ManualStudentsManager } from "@/components/lecturer/manual-students-manager";
import { getManualStudentsForSession } from "@/lib/lecturer/manual-students";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import {
  isSubscriptionWritable,
  refreshSubscriptionLifecycle,
} from "@/lib/subscription";

export const dynamic = "force-dynamic";

export default async function ManualStudentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAuthenticatedUser();

  const session = await getClassSessionForLecturer(id, user.id);
  if (!session) notFound();

  const [students, subscription] = await Promise.all([
    getManualStudentsForSession(id, user.id),
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
      <ManualStudentsManager
        sessionId={id}
        initialStudents={students}
        canWrite={canWrite}
      />
    </DashboardShell>
  );
}
