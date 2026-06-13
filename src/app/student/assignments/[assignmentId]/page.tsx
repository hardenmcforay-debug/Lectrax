import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { getStudentAssignmentDetail } from "@/lib/student/assignment-queries";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StudentAssignmentDetailClient } from "@/components/student/student-assignment-detail-client";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function StudentAssignmentDetailsPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const user = await requireAuthenticatedUser();

  const detail = await getStudentAssignmentDetail(user.id, assignmentId);

  if (!detail) {
    notFound();
  }

  return (
    <DashboardShell
      role="student"
      title="Assignment Submission"
      description="Upload your PDF submission and view your grade"
    >
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/student/assignments">Back</Link>
        </Button>
      </div>
      <StudentAssignmentDetailClient
        key={`${detail.submission?.id ?? "none"}-${detail.grade ?? "none"}-${detail.submission?.submitted_at ?? ""}`}
        assignmentId={assignmentId}
        initial={detail}
      />
    </DashboardShell>
  );
}
