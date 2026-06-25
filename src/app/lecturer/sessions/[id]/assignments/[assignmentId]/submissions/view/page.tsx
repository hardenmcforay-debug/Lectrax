import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { getClassAssignmentForLecturer } from "@/lib/lecturer/class-assignments";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { SubmissionPdfViewClient } from "@/components/lecturer/submission-pdf-view-client";

export const dynamic = "force-dynamic";

export default async function ViewAssignmentSubmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
  searchParams: Promise<{ enrollmentId?: string; fileName?: string }>;
}) {
  const { id: classSessionId, assignmentId } = await params;
  const { enrollmentId: enrollmentIdParam, fileName } = await searchParams;

  if (!enrollmentIdParam) {
    redirect(`/lecturer/sessions/${classSessionId}/assignments/${assignmentId}`);
  }

  const enrollmentIdParsed = z.string().uuid().safeParse(enrollmentIdParam);
  if (!enrollmentIdParsed.success) notFound();

  const user = await requireAuthenticatedUser();
  const assignment = await getClassAssignmentForLecturer(assignmentId, user.id);

  if (!assignment || assignment.class_session_id !== classSessionId) notFound();

  const enrollmentId = enrollmentIdParsed.data;
  const title = fileName?.trim() || "Submission PDF";
  const viewUrl = `/api/lecturer/sessions/${classSessionId}/assignments/${assignmentId}/submissions/download?enrollmentId=${enrollmentId}&inline=1`;
  const backHref = `/lecturer/sessions/${classSessionId}/assignments/${assignmentId}`;

  return (
    <DashboardShell
      role="lecturer"
      title={title}
      description="Review the student's assignment submission."
    >
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href={backHref}>Back to grading</Link>
        </Button>
      </div>
      <SubmissionPdfViewClient viewUrl={viewUrl} title={title} backHref={backHref} />
    </DashboardShell>
  );
}
