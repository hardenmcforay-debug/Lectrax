import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CreateSessionForm } from "@/components/lecturer/create-session-form";
import { Button } from "@/components/ui/button";

export default function NewSessionPage() {
  return (
    <DashboardShell
      role="lecturer"
      title="Create Class Session"
      description="Create a class session and manage attendance, assignments, assessments, and student engagement from a single workspace."
    >
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/lecturer/sessions">Back</Link>
        </Button>
      </div>
      <CreateSessionForm />
    </DashboardShell>
  );
}
