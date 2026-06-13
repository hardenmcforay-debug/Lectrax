import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getDisplayName } from "@/lib/auth/display-name";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users } from "lucide-react";
import {
  buildSubscriptionDisplay,
  getSubscriptionDisplayForLecturer,
} from "@/lib/subscription";
import {
  buildLecturerDashboardGreeting,
  LECTURER_DASHBOARD_SUBTITLE,
} from "@/lib/auth/lecturer-greeting";
import {
  SubscriptionDashboardCard,
  SubscriptionStatusBanner,
} from "@/components/lecturer/subscription-dashboard-card";
import { LecturerAnalyticsSection } from "@/components/lecturer/lecturer-analytics-section";
import { getLecturerAttendanceAnalytics } from "@/lib/lecturer/analytics";
import {
  lecturerDashboardCardHeadingClass,
  lecturerPortalCardClass,
  lecturerPortalNestedItemClass,
} from "@/components/lecturer/lecturer-dashboard-styles";

export default async function LecturerDashboard() {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();

  let lecturerName = "Lecturer";
  try {
    const profile = await getProfileByUserId(user.id);
    lecturerName = getDisplayName(user, profile, "Lecturer");
  } catch {
    lecturerName = getDisplayName(user, null, "Lecturer");
  }

  let subscription = null;
  let display = buildSubscriptionDisplay(null);

  try {
    ({ subscription, display } = await getSubscriptionDisplayForLecturer(user.id));
  } catch {
    // Supabase/network hiccups should not crash the dashboard shell.
  }

  let sessions: { id: string; title: string; course_code: string; session_code: string }[] = [];
  let sessionCount = 0;
  let studentCount = 0;
  let attendanceData: Awaited<ReturnType<typeof getLecturerAttendanceAnalytics>> = [];

  try {
    const [sessionsResult, countResult, allSessionsResult, analyticsResult] = await Promise.all([
      supabase
        .from("class_sessions")
        .select("id, title, course_code, session_code")
        .eq("lecturer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("class_sessions")
        .select("id", { count: "exact", head: true })
        .eq("lecturer_id", user.id),
      supabase.from("class_sessions").select("id").eq("lecturer_id", user.id),
      getLecturerAttendanceAnalytics(user.id),
    ]);

    sessions = sessionsResult.data ?? [];
    sessionCount = countResult.count ?? 0;
    attendanceData = analyticsResult;

    const allSessionIds = (allSessionsResult.data ?? []).map((s) => s.id);
    if (allSessionIds.length) {
      const studentResult = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .in("class_session_id", allSessionIds);
      studentCount = studentResult.count ?? 0;
    }
  } catch {
    // Keep dashboard usable when data fetch fails transiently.
  }

  return (
    <DashboardShell
      role="lecturer"
      headerVariant="lecturer-greeting"
      title={buildLecturerDashboardGreeting(lecturerName)}
      description={LECTURER_DASHBOARD_SUBTITLE}
    >
      <SubscriptionStatusBanner display={display} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Class Sessions"
          value={sessionCount ?? 0}
          icon={BookOpen}
          titleClassName={lecturerDashboardCardHeadingClass}
          className={lecturerPortalCardClass}
        />
        <StatCard
          title="Total Students"
          value={studentCount ?? 0}
          icon={Users}
          titleClassName={lecturerDashboardCardHeadingClass}
          className={lecturerPortalCardClass}
        />
        <SubscriptionDashboardCard display={display} />
      </div>

      <LecturerAnalyticsSection subscription={subscription} attendanceData={attendanceData} />

      <Card className={`mt-8 ${lecturerPortalCardClass}`}>
        <CardHeader>
          <CardTitle className={lecturerDashboardCardHeadingClass}>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground">No class sessions yet.</p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/lecturer/sessions/${s.id}`}
                    className={`flex justify-between rounded-lg border p-4 hover:bg-muted ${lecturerPortalNestedItemClass}`}
                  >
                    <span className="font-medium">
                      {s.course_code} — {s.title}
                    </span>
                    <span className="font-mono text-sm text-accent">{s.session_code}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
