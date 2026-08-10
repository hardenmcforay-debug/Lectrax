import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CreateSessionForm } from "@/components/lecturer/create-session-form";
import { BackLink } from "@/components/ui/back-link";

export default function NewSessionPage() {
  const year = new Date().getFullYear();
  const defaultAcademicYear = `${year}/${year + 1}`;

  return (
    <DashboardShell role="lecturer" title="Create Class Session">
      <div className="mb-4">
        <BackLink href="/lecturer/sessions" />
      </div>
      <CreateSessionForm defaultAcademicYear={defaultAcademicYear} />
    </DashboardShell>
  );
}
