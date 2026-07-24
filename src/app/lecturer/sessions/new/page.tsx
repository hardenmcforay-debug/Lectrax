import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CreateSessionForm } from "@/components/lecturer/create-session-form";
import { BackLink } from "@/components/ui/back-link";

export default function NewSessionPage() {
  return (
    <DashboardShell
      role="lecturer"
      title="Create Class Session"
      description="Create a class session and manage attendance, assignments, assessments, and student engagement from a single workspace."
    >
      <div className="mb-4">
        <BackLink href="/lecturer/sessions" />
      </div>
      <CreateSessionForm />
    </DashboardShell>
  );
}
