import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import {
  getActiveAttendanceSession,
  getAttendanceSessionNumber,
} from "@/lib/attendance/sessions";
import { getStudentTableRows } from "@/lib/session-data";
import type { ClassTestSummary } from "@/lib/session-data";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SessionPageClient } from "@/components/lecturer/session-page-client";
import {
  buildSubscriptionDisplay,
  isPremiumFeatureUnlocked,
  refreshSubscriptionLifecycle,
} from "@/lib/subscription";
import { resolveCaWeightsFromStorage } from "@/lib/ca/constants";
import type { SessionAssignmentSummary } from "@/components/lecturer/session-page-client";
import type { SessionAttendanceAudit } from "@/components/lecturer/session-audit-panel";
import type { AuditLog, StudentTableRow } from "@/types/database";

export const dynamic = "force-dynamic";

const SESSION_TABS = ["info", "students", "attendance", "assignments", "ca", "audit"] as const;

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const defaultTab = SESSION_TABS.includes(tab as (typeof SESSION_TABS)[number])
    ? (tab as (typeof SESSION_TABS)[number])
    : "students";
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();

  const session = await getClassSessionForLecturer(id, user.id);
  if (!session) notFound();

  const service = await createServiceClient();

  const [
    ,
    tableData,
    caConfigResult,
    assignmentsResult,
    attendanceSessionsResult,
    auditLogsResult,
    activeAttendanceSession,
    subscription,
  ] = await Promise.all([
    service.rpc("lock_expired_assignment_submissions", { p_assignment_id: null }),
    getStudentTableRows(id, session.semester, session.academic_year, user.id).catch((error) => {
      console.error("[SessionDetailPage] getStudentTableRows failed", error);
      return {
        rows: [] as StudentTableRow[],
        testCount: 0,
        classTests: [] as ClassTestSummary[],
        classAssignments: [] as { id: string; max_score: number }[],
      };
    }),
    service
      .from("ca_configurations")
      .select("attendance_weight, assignment_weight, test_weight")
      .eq("class_session_id", id)
      .eq("semester", session.semester)
      .eq("academic_year", session.academic_year)
      .maybeSingle(),
    supabase
      .from("assignments")
      .select("id, title, description, deadline, max_score")
      .eq("class_session_id", id)
      .order("created_at", { ascending: false }),
    service
      .from("attendance_sessions")
      .select(
        "id, title, session_date, created_at, ended_at, session_expires_at, attendance_records(count)"
      )
      .eq("class_session_id", id)
      .order("created_at", { ascending: false }),
    service
      .from("audit_logs")
      .select("id, action, entity_type, created_at")
      .eq("class_session_id", id)
      .order("created_at", { ascending: false }),
    getActiveAttendanceSession(id, user.id),
    refreshSubscriptionLifecycle(user.id).catch((error) => {
      console.error("[SessionDetailPage] subscription refresh failed", error);
      return null;
    }),
  ]);

  const activeSessionNumber = activeAttendanceSession
    ? await getAttendanceSessionNumber(id, activeAttendanceSession.created_at, service)
    : null;

  const caConfig = caConfigResult.data;
  const caWeights = caConfig
    ? resolveCaWeightsFromStorage(
        caConfig.attendance_weight,
        caConfig.assignment_weight,
        caConfig.test_weight
      )
    : undefined;

  const sessionAssignments = (assignmentsResult.data ?? []) as SessionAssignmentSummary[];
  const sessionAuditLogs = (auditLogsResult.data ??
    []) as Pick<AuditLog, "id" | "action" | "entity_type" | "created_at">[];

  const attendanceAuditSessions: SessionAttendanceAudit[] = (
    attendanceSessionsResult.data ?? []
  ).map((s) => ({
    id: s.id,
    title: s.title,
    session_date: s.session_date,
    created_at: s.created_at,
    ended_at: s.ended_at,
    session_expires_at: s.session_expires_at,
    recordCount: (s.attendance_records as { count: number }[])?.[0]?.count ?? 0,
  }));

  const subscriptionDisplay = buildSubscriptionDisplay(subscription);
  const showAuditLogs = isPremiumFeatureUnlocked(subscription);

  return (
    <DashboardShell
      role="lecturer"
      title={`${session.course_code} — ${session.title}`}
      description="Manage attendance, assignments, assessments, and student performance for this class session."
    >
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/lecturer/sessions">Back</Link>
        </Button>
      </div>
      <SessionPageClient
        session={session}
        rows={tableData.rows}
        semester={session.semester}
        caWeights={caWeights}
        testCount={tableData.testCount}
        initialClassTests={tableData.classTests}
        initialClassAssignments={tableData.classAssignments}
        sessionAssignments={sessionAssignments}
        attendanceAuditSessions={attendanceAuditSessions}
        attendancePresentBySession={{}}
        sessionAuditLogs={sessionAuditLogs}
        initialActiveSession={
          activeAttendanceSession
            ? {
                id: activeAttendanceSession.id,
                title: activeAttendanceSession.title,
                session_date: activeAttendanceSession.session_date,
                created_at: activeAttendanceSession.created_at,
                session_expires_at: activeAttendanceSession.session_expires_at,
              }
            : null
        }
        initialSessionNumber={activeSessionNumber}
        defaultTab={defaultTab}
        canWrite={subscriptionDisplay.canWrite}
        showAuditLogs={showAuditLogs}
        subscriptionPlan={subscription?.plan ?? "free"}
      />
    </DashboardShell>
  );
}
