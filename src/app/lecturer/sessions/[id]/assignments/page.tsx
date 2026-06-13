import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import {
  canCreateAssignment,
  getAssignmentLimitReachedMessage,
} from "@/lib/lecturer/assignment-limits";
import { refreshSubscriptionLifecycle } from "@/lib/subscription";
import { CreateAssignmentForm } from "./create-assignment-form";
import { lecturerPortalCardClass } from "@/components/lecturer/lecturer-dashboard-styles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SessionAssignmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAuthenticatedUser();

  const service = await createServiceClient();
  const { data: session } = await service
    .from("class_sessions")
    .select("id")
    .eq("id", id)
    .eq("lecturer_id", user.id)
    .maybeSingle();

  if (!session) notFound();

  const subscription = await refreshSubscriptionLifecycle(user.id);
  const plan = subscription?.plan ?? "free";

  const { count } = await service
    .from("assignments")
    .select("*", { count: "exact", head: true })
    .eq("class_session_id", id);

  const atLimit = !canCreateAssignment(plan, count ?? 0);
  const limitMessage = getAssignmentLimitReachedMessage(plan);

  return (
    <DashboardShell
      role="lecturer"
      title="Create Assignment"
      description="Create assignments, set deadlines, and manage coursework for students in this class session."
    >
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/lecturer/sessions/${id}?tab=assignments`}>Back</Link>
        </Button>
      </div>
      {atLimit ? (
        <Card className={cn(lecturerPortalCardClass, "border-amber-200 bg-amber-50")}>
          <CardContent className="py-6 text-sm text-amber-900">{limitMessage}</CardContent>
        </Card>
      ) : (
        <CreateAssignmentForm sessionId={id} />
      )}
    </DashboardShell>
  );
}
