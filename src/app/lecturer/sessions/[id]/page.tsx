import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import {
  getActiveAttendanceSession,
  getAttendanceSessionNumber,
} from "@/lib/attendance/sessions";
import { getStudentTableRows } from "@/lib/session-data";
import type { ClassTestSummary } from "@/lib/session-data";
import { PAGINATION, clampPage, toRangeBounds } from "@/lib/pagination";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SessionPageClient } from "@/components/lecturer/session-page-client";
import { BackLink } from "@/components/ui/back-link";
import {
  buildSubscriptionDisplay,
  isPremiumFeatureUnlocked,
  refreshSubscriptionLifecycle,
} from "@/lib/subscription";
import { parseCaWeights } from "@/lib/ca/constants";
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
  searchParams: Promise<{
    tab?: string;
    attendancePage?: string;
    auditPage?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const defaultTab = SESSION_TABS.includes(sp.tab as (typeof SESSION_TABS)[number])
    ? (sp.tab as (typeof SESSION_TABS)[number])
    : "students";
  const attendancePage = clampPage(Number(sp.attendancePage ?? undefined));
  const auditPage = clampPage(Number(sp.auditPage ?? undefined));
  const attendanceBounds = toRangeBounds(attendancePage, PAGINATION.DEFAULT_PAGE_SIZE);
  const auditBounds = toRangeBounds(auditPage, PAGINATION.DEFAULT_PAGE_SIZE);

  const user = await requireAuthenticatedUser();
  const supabase = await createClient();

  const session = await getClassSessionForLecturer(id, user.id);
  if (!session) notFound();

  const [
    ,
    tableData,
    attendanceRosterResult,
    caConfigResult,
    assignmentsResult,
    attendanceSessionsResult,
    auditLogsResult,
    activeAttendanceSession,
    subscription,
  ] = await Promise.all([
    supabase.rpc("lock_expired_assignment_submissions", { p_assignment_id: null }),
    getStudentTableRows(id, session.semester, session.academic_year, user.id, undefined, {
      page: 1,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    }).catch((error) => {
      if (process.env.NODE_ENV === "development") {
        console.error("[SessionDetailPage] getStudentTableRows failed", error);
      }
      return {
        rows: [] as StudentTableRow[],
        testCount: 0,
        classTests: [] as ClassTestSummary[],
        classAssignments: [] as { id: string; max_score: number }[],
        total: 0,
      };
    }),
    // Slim roster for manual attendance (separate from paginated CA table rows).
    supabase
      .from("enrollments")
      .select(
        "id, college_id, is_manual, profiles(full_name, college_id), manual_students(full_name, college_id)"
      )
      .eq("class_session_id", id)
      .order("created_at", { ascending: true })
      .limit(PAGINATION.MAX_PRESENT_PAGE_SIZE),
    supabase
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
      .order("created_at", { ascending: false })
      .limit(PAGINATION.MAX_PAGE_SIZE),
    supabase
      .from("attendance_sessions")
      .select(
        "id, title, session_date, created_at, ended_at, session_expires_at, attendance_records(count)",
        { count: "exact" }
      )
      .eq("class_session_id", id)
      .order("created_at", { ascending: false })
      .range(attendanceBounds.from, attendanceBounds.to),
    supabase
      .from("audit_logs")
      .select("id, action, entity_type, created_at", { count: "exact" })
      .eq("class_session_id", id)
      .order("created_at", { ascending: false })
      .range(auditBounds.from, auditBounds.to),
    getActiveAttendanceSession(id, user.id),
    refreshSubscriptionLifecycle(user.id).catch((error) => {
      if (process.env.NODE_ENV === "development") {
        console.error("[SessionDetailPage] subscription refresh failed", error);
      }
      return null;
    }),
  ]);

  const attendanceRows = (attendanceRosterResult.data ?? []).map((e) => {
    const name = e.is_manual
      ? (e.manual_students as unknown as { full_name: string } | null)?.full_name
      : (e.profiles as unknown as { full_name: string } | null)?.full_name;
    const collegeId =
      e.college_id ??
      (e.is_manual
        ? (e.manual_students as unknown as { college_id: string | null } | null)?.college_id
        : (e.profiles as unknown as { college_id: string | null } | null)?.college_id);

    return {
      enrollmentId: e.id as string,
      name: name ?? "Unknown",
      collegeId: collegeId ?? null,
    };
  });

  const activeSessionNumber = activeAttendanceSession
    ? await getAttendanceSessionNumber(id, activeAttendanceSession.created_at, supabase)
    : null;

  const caConfig = caConfigResult.data;
  const caWeights = caConfig
    ? parseCaWeights(
        caConfig.attendance_weight,
        caConfig.assignment_weight,
        caConfig.test_weight
      )
    : undefined;

  const sessionAssignments = (assignmentsResult.data ?? []) as SessionAssignmentSummary[];
  const subscriptionDisplay = buildSubscriptionDisplay(subscription);
  const showAuditLogs = isPremiumFeatureUnlocked(subscription);

  const sessionAuditLogs = showAuditLogs
    ? ((auditLogsResult.data ?? []) as Pick<
        AuditLog,
        "id" | "action" | "entity_type" | "created_at"
      >[])
    : [];

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

  return (
    <DashboardShell
      role="lecturer"
      title={`${session.course_code} — ${session.title}`}
      description="Manage attendance, assignments, assessments, and student performance for this class session."
    >
      <div className="mb-4">
        <BackLink href="/lecturer/sessions" />
      </div>
      <SessionPageClient
        session={session}
        rows={tableData.rows}
        studentRowsTotal={tableData.total}
        attendanceRows={attendanceRows}
        semester={session.semester}
        caWeights={caWeights}
        testCount={tableData.testCount}
        initialClassTests={tableData.classTests}
        initialClassAssignments={tableData.classAssignments}
        sessionAssignments={sessionAssignments}
        attendanceAuditSessions={attendanceAuditSessions}
        attendanceSessionsTotal={attendanceSessionsResult.count ?? 0}
        attendancePage={attendancePage}
        attendancePresentBySession={{}}
        sessionAuditLogs={sessionAuditLogs}
        auditLogsTotal={showAuditLogs ? (auditLogsResult.count ?? 0) : 0}
        auditPage={auditPage}
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
