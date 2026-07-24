import { notFound } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { getTestGradeEntryData } from "@/lib/lecturer/class-tests";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { BackLink } from "@/components/ui/back-link";
import { TestGradesClient } from "@/components/lecturer/test-grades-client";

export const dynamic = "force-dynamic";

export default async function TestGradesPage({
  params,
}: {
  params: Promise<{ id: string; testId: string }>;
}) {
  const { id, testId } = await params;
  const user = await requireAuthenticatedUser();

  try {
    const data = await getTestGradeEntryData(testId, user.id);
    if (!data || data.test.class_session_id !== id) notFound();

    return (
      <DashboardShell
        role="lecturer"
        title="Enter test scores"
        description="Enter and manage test scores while maintaining accurate student assessment records."
      >
        <div className="mb-4">
          <BackLink href={`/lecturer/sessions/${id}?tab=ca`} />
        </div>
        <TestGradesClient classSessionId={id} data={data} />
      </DashboardShell>
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[TestGradesPage] getTestGradeEntryData failed", error);
    }
    return (
      <DashboardShell
        role="lecturer"
        title="Enter test scores"
        description="Enter and manage test scores while maintaining accurate student assessment records."
      >
        <div className="mb-4">
          <BackLink href={`/lecturer/sessions/${id}?tab=ca`} />
        </div>
        <p className="text-sm text-destructive">
          Could not load test grades. Please refresh the page or try again later.
        </p>
      </DashboardShell>
    );
  }
}
