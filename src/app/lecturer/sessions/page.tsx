import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { getLecturerClassSessions } from "@/lib/lecturer/class-sessions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { SEMESTER_LABELS } from "@/types/database";
import { lecturerPortalCardClass } from "@/components/lecturer/lecturer-dashboard-styles";
import { cn } from "@/lib/utils";

export default async function SessionsPage() {
  const user = await requireAuthenticatedUser();

  const sessions = await getLecturerClassSessions(user.id);

  return (
    <DashboardShell
      role="lecturer"
      title="Class Sessions"
      description="Manage your class sessions, attendance, assignments, and assessments from a single academic workspace."
    >
      <div className="mb-6 flex justify-end">
        <Button asChild>
          <Link href="/lecturer/sessions/new">
            <Plus className="mr-2 h-4 w-4" />
            New Session
          </Link>
        </Button>
      </div>
      <div className="portal-stat-grid">
        {(sessions ?? []).map((s) => (
          <Link key={s.id} href={`/lecturer/sessions/${s.id}`}>
            <Card className={cn(lecturerPortalCardClass, "h-full transition-shadow hover:shadow-[0_8px_28px_-6px_rgba(15,23,42,0.14)]")}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{s.course_code}</CardTitle>
                  <Badge variant="accent" className="font-mono">
                    {s.session_code}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{s.title}</p>
                {s.class_name && (
                  <p className="text-xs text-muted-foreground">{s.class_name}</p>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {SEMESTER_LABELS[s.semester]} · {s.academic_year}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}
