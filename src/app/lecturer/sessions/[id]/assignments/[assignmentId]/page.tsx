import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { getAssignmentGradeEntryData } from "@/lib/lecturer/class-assignments";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { AssignmentGradesClient } from "@/components/lecturer/assignment-grades-client";

export const dynamic = "force-dynamic";

export default async function AssignmentGradesPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  const { id, assignmentId } = await params;

  const user = await requireAuthenticatedUser();

  try {
    const data = await getAssignmentGradeEntryData(assignmentId, user.id);
    if (!data || data.assignment.class_session_id !== id) notFound();

    return (
      <DashboardShell
        role="lecturer"
        title="Enter assignment grades"
        description="Enter and manage assignment grades while maintaining accurate student assessment records."
      >
        <div className="mb-4">
          <Button asChild variant="outline" size="sm">
            <Link href={`/lecturer/sessions/${id}?tab=assignments`}>Back</Link>
          </Button>
        </div>
        <AssignmentGradesClient classSessionId={id} data={data} />
      </DashboardShell>
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[AssignmentGradesPage] getAssignmentGradeEntryData failed", error);
    }
    return (
      <DashboardShell
        role="lecturer"
        title="Enter assignment grades"
        description="Enter and manage assignment grades while maintaining accurate student assessment records."
      >
        <div className="mb-4">
          <Button asChild variant="outline" size="sm">
            <Link href={`/lecturer/sessions/${id}?tab=assignments`}>Back</Link>
          </Button>
        </div>
        <p className="text-sm text-destructive">
          Could not load assignment grades. Please refresh the page or try again later.
        </p>
      </DashboardShell>
    );
  }
}
