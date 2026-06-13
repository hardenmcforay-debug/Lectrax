import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CreateSessionForm } from "@/components/lecturer/create-session-form";

export default function NewSessionPage() {
  return (
    <DashboardShell
      role="lecturer"
      title="Create Class Session"
      description="Create a class session and manage attendance, assignments, assessments, and student engagement from a single workspace."
    >
      <CreateSessionForm />
    </DashboardShell>
  );
}
