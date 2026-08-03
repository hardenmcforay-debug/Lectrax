import { notFound } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { getAssignmentGradeEntryData } from "@/lib/lecturer/class-assignments";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { BackLink } from "@/components/ui/back-link";
import { AssignmentGradesClient } from "@/components/lecturer/assignment-grades-client";

export const dynamic = "force-dynamic";

export default async function AssignmentGradesPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  const { id, assignmentId } = await params;

  const user = await requireAuthenticatedUser();

  let data: Awaited<ReturnType<typeof getAssignmentGradeEntryData>> | null = null;
  let loadFailed = false;
  try {
    data = await getAssignmentGradeEntryData(assignmentId, user.id);
  } catch (error) {
    loadFailed = true;
    if (process.env.NODE_ENV === "development") {
      console.error("[AssignmentGradesPage] getAssignmentGradeEntryData failed", error);
    }
  }

  if (!loadFailed && (!data || data.assignment.class_session_id !== id)) notFound();

  return (
    <DashboardShell
      role="lecturer"
      title="Enter assignment grades"
      description="Enter and manage assignment grades while maintaining accurate student assessment records."
    >
      <div className="mb-4">
        <BackLink href={`/lecturer/sessions/${id}?tab=assignments`} />
      </div>
      {loadFailed || !data ? (
        <p className="text-sm text-destructive">
          Could not load assignment grades. Please refresh the page or try again later.
        </p>
      ) : (
        <AssignmentGradesClient classSessionId={id} data={data} />
      )}
    </DashboardShell>
  );
}
