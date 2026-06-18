"use client";

import { appFetch } from "@/lib/api/client-fetch";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPercent } from "@/lib/utils";
import type { ClassSession, StudentTableRow, SemesterType } from "@/types/database";
import type { ClassTestSummary } from "@/lib/session-data";
import { SEMESTER_LABELS } from "@/types/database";
import { CaStructurePanel } from "@/components/lecturer/ca-structure-panel";
import { lecturerPortalCardClass } from "@/components/lecturer/lecturer-dashboard-styles";
import { cn } from "@/lib/utils";
import {
  SessionAuditPanel,
  type SessionAttendanceAudit,
} from "@/components/lecturer/session-audit-panel";
import type { AuditLog } from "@/types/database";
import { CaTestTableCells, CaTestTableHeaders } from "@/components/shared/ca-test-table-columns";
import { StudentPerformanceExportButton } from "@/components/lecturer/student-performance-export-button";
import {
  AttendanceSessionPanel,
  type ActiveAttendanceSession,
} from "@/components/lecturer/attendance-session-panel";
import type { SubscriptionTier } from "@/lib/subscription/constants";
import {
  canCreateAssignment as canCreateMoreAssignments,
  getAssignmentLimitReachedMessage,
} from "@/lib/lecturer/assignment-limits";
import type { CAWeights } from "@/lib/ca/constants";
import type { AttendancePresentStudent } from "@/lib/lecturer/attendance-sessions";
import { AssignmentDeadline } from "@/components/shared/assignment-deadline";
import { AssignmentOpenClosedBadge } from "@/components/shared/assignment-status-badge";
import { isPastDeadline } from "@/lib/assignments/deadline";
import { manualStudentSchema } from "@/lib/validations";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { useHydrated } from "@/lib/hooks/use-hydrated";

const SESSION_TAB_ITEMS = [
  { value: "info", label: "Info" },
  { value: "students", label: "Students" },
  { value: "attendance", label: "Attendance" },
  { value: "assignments", label: "Assignments" },
  { value: "ca", label: "CA" },
  { value: "audit", label: "Audit" },
] as const;

function SessionTabsPlaceholder({
  defaultTab,
  showAuditLogs,
}: {
  defaultTab: string;
  showAuditLogs: boolean;
}) {
  const tabs = SESSION_TAB_ITEMS.filter((tab) => tab.value !== "audit" || showAuditLogs);

  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading session tabs">
      <div className="mb-6 inline-flex h-10 flex-wrap items-center justify-center gap-1 rounded-md bg-muted p-1 text-muted-foreground max-lg:mb-10">
        {tabs.map((tab) => (
          <span
            key={tab.value}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium",
              tab.value === defaultTab && "bg-background text-foreground shadow-sm"
            )}
          >
            {tab.label}
          </span>
        ))}
      </div>
      <div className="min-h-[240px] animate-pulse rounded-lg bg-muted/40" />
    </div>
  );
}

export type SessionAssignmentSummary = {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  max_score: number;
};

export function SessionPageClient({
  session,
  rows,
  semester,
  caWeights: initialCaWeights,
  testCount,
  initialClassTests,
  initialClassAssignments,
  sessionAssignments = [],
  attendanceAuditSessions = [],
  attendancePresentBySession = {},
  sessionAuditLogs = [],
  initialActiveSession = null,
  initialSessionNumber = null,
  defaultTab = "students",
  canWrite = true,
  showAuditLogs = false,
  subscriptionPlan = "free",
}: {
  session: ClassSession;
  rows: StudentTableRow[];
  semester: SemesterType;
  caWeights?: { attendance: number; assignment: number; test: number };
  testCount: number;
  initialClassTests: ClassTestSummary[];
  initialClassAssignments: { id: string; max_score: number }[];
  sessionAssignments?: SessionAssignmentSummary[];
  attendanceAuditSessions?: SessionAttendanceAudit[];
  attendancePresentBySession?: Record<string, AttendancePresentStudent[]>;
  sessionAuditLogs?: Pick<AuditLog, "id" | "action" | "entity_type" | "created_at">[];
  initialActiveSession?: ActiveAttendanceSession | null;
  initialSessionNumber?: number | null;
  defaultTab?: string;
  canWrite?: boolean;
  showAuditLogs?: boolean;
  subscriptionPlan?: SubscriptionTier;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [manualName, setManualName] = useState("");
  const [manualCollegeId, setManualCollegeId] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [addingManual, setAddingManual] = useState(false);
  const [assignments, setAssignments] = useState(sessionAssignments);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] =
    useState<SessionAssignmentSummary | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState(false);
  const [deleteAssignmentError, setDeleteAssignmentError] = useState<string | null>(null);
  const [assignmentLimitMessage, setAssignmentLimitMessage] = useState<string | null>(null);
  const [closeSessionOpen, setCloseSessionOpen] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [closeSessionError, setCloseSessionError] = useState<string | null>(null);
  const [studentRows, setStudentRows] = useState(rows);
  const studentRowsRefreshTimerRef = useRef<number | null>(null);
  const caPreviewTimerRef = useRef<number | null>(null);
  const savedCaWeightsRef = useRef<CAWeights | undefined>(initialCaWeights);

  useEffect(() => {
    setStudentRows(rows);
    savedCaWeightsRef.current = initialCaWeights;
  }, [rows, initialCaWeights]);

  useEffect(() => {
    setAssignments(sessionAssignments);
    setAssignmentLimitMessage(null);
  }, [sessionAssignments]);

  const allowCreateAssignment = canWrite && canCreateMoreAssignments(subscriptionPlan, assignments.length);

  function handleCreateAssignmentClick() {
    if (!canWrite) return;

    if (!canCreateMoreAssignments(subscriptionPlan, assignments.length)) {
      setAssignmentLimitMessage(getAssignmentLimitReachedMessage(subscriptionPlan));
      return;
    }

    setAssignmentLimitMessage(null);
    router.push(`/lecturer/sessions/${session.id}/assignments`);
  }

  async function handleCloseSession() {
    setCloseSessionError(null);
    setClosingSession(true);

    try {
      const res = await appFetch(`/api/lecturer/sessions/${session.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setCloseSessionError(data.error ?? "Could not close session.");
        return;
      }

      setCloseSessionOpen(false);
      router.push("/lecturer/sessions");
      router.refresh();
    } catch {
      setCloseSessionError("Network error. Please try again.");
    } finally {
      setClosingSession(false);
    }
  }

  const refreshStudentRows = useCallback(async (previewWeights?: CAWeights) => {
    try {
      const params =
        previewWeights != null
          ? new URLSearchParams({
              attendanceWeight: String(previewWeights.attendance),
              assignmentWeight: String(previewWeights.assignment),
              testWeight: String(previewWeights.test),
            })
          : null;
      const url = params
        ? `/api/lecturer/sessions/${session.id}/student-rows?${params.toString()}`
        : `/api/lecturer/sessions/${session.id}/student-rows`;
      const res = await appFetch(url);
      const data = (await res.json()) as { rows?: StudentTableRow[] };

      if (res.ok && data.rows) {
        setStudentRows(data.rows);
      }
    } catch {
      console.error("[SessionPageClient] refreshStudentRows failed");
    }
  }, [session.id]);

  const handleCaWeightsChange = useCallback(
    (weights: CAWeights) => {
      const saved = savedCaWeightsRef.current;
      const matchesSaved =
        saved != null &&
        saved.attendance === weights.attendance &&
        saved.assignment === weights.assignment &&
        saved.test === weights.test;

      if (caPreviewTimerRef.current) {
        window.clearTimeout(caPreviewTimerRef.current);
      }

      caPreviewTimerRef.current = window.setTimeout(() => {
        void refreshStudentRows(matchesSaved ? undefined : weights);
      }, 400);
    },
    [refreshStudentRows]
  );

  const handleCaConfigSaved = useCallback(
    (weights: CAWeights) => {
      if (caPreviewTimerRef.current) {
        window.clearTimeout(caPreviewTimerRef.current);
      }
      savedCaWeightsRef.current = weights;
      void refreshStudentRows();
    },
    [refreshStudentRows]
  );

  const scheduleRefreshStudentRows = useCallback(() => {
    if (studentRowsRefreshTimerRef.current) {
      window.clearTimeout(studentRowsRefreshTimerRef.current);
    }
    studentRowsRefreshTimerRef.current = window.setTimeout(() => {
      void refreshStudentRows();
    }, 400);
  }, [refreshStudentRows]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`class-session-attendance-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance_records",
          filter: `class_session_id=eq.${session.id}`,
        },
        () => scheduleRefreshStudentRows()
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "attendance_records",
          filter: `class_session_id=eq.${session.id}`,
        },
        () => scheduleRefreshStudentRows()
      )
      .subscribe();

    return () => {
      if (studentRowsRefreshTimerRef.current) {
        window.clearTimeout(studentRowsRefreshTimerRef.current);
      }
      if (caPreviewTimerRef.current) {
        window.clearTimeout(caPreviewTimerRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [session.id, scheduleRefreshStudentRows]);

  async function handleDeleteAssignment() {
    if (!deleteAssignmentTarget) return;
    setDeleteAssignmentError(null);
    setDeletingAssignment(true);

    try {
      const res = await appFetch(
        `/api/lecturer/sessions/${session.id}/assignments/${deleteAssignmentTarget.id}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setDeleteAssignmentError(data.error ?? "Could not delete assignment.");
        return;
      }

      setAssignments((prev) => prev.filter((a) => a.id !== deleteAssignmentTarget.id));
      setDeleteAssignmentTarget(null);
      router.refresh();
    } catch {
      setDeleteAssignmentError("Network error. Please try again.");
    } finally {
      setDeletingAssignment(false);
    }
  }

  async function addManualStudent(event?: FormEvent) {
    event?.preventDefault();
    setManualError(null);

    const parsed = manualStudentSchema.safeParse({
      fullName: manualName,
      collegeId: manualCollegeId || undefined,
    });

    if (!parsed.success) {
      setManualError(parsed.error.errors[0]?.message ?? "Invalid student details.");
      return;
    }

    setAddingManual(true);

    try {
      const res = await appFetch(`/api/lecturer/sessions/${session.id}/students/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setManualError(
          sanitizeErrorMessage(data.error) ?? "Could not add student. Please try again."
        );
        return;
      }

      setManualName("");
      setManualCollegeId("");
      router.refresh();
    } catch {
      setManualError("Network error. Check your connection and try again.");
    } finally {
      setAddingManual(false);
    }
  }

  if (!hydrated) {
    return <SessionTabsPlaceholder defaultTab={defaultTab} showAuditLogs={showAuditLogs} />;
  }

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="mb-6 flex flex-wrap gap-1 max-lg:mb-10">
        <TabsTrigger value="info">Info</TabsTrigger>
        <TabsTrigger value="students">Students</TabsTrigger>
        <TabsTrigger value="attendance">Attendance</TabsTrigger>
        <TabsTrigger value="assignments">Assignments</TabsTrigger>
        <TabsTrigger value="ca">CA</TabsTrigger>
        {showAuditLogs && <TabsTrigger value="audit">Audit</TabsTrigger>}
      </TabsList>

      <TabsContent value="info">
        <Card className={lecturerPortalCardClass}>
          <CardHeader>
            <CardTitle>{session.course_code} — {session.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Session Code:</span>
              <Badge className="font-mono">{session.session_code}</Badge>
            </div>
            {session.class_name && (
              <p><span className="text-muted-foreground">Class:</span> {session.class_name}</p>
            )}
            <p><span className="text-muted-foreground">Semester:</span> {SEMESTER_LABELS[session.semester]}</p>
            <p><span className="text-muted-foreground">Academic Year:</span> {session.academic_year}</p>
            {canWrite ? (
              <div className="sm:col-span-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setCloseSessionError(null);
                    setCloseSessionOpen(true);
                  }}
                >
                  Close Session
                </Button>
              </div>
            ) : (
              <p className="sm:col-span-2 pt-2 text-sm text-amber-800">
                Your account is in read-only mode. Renew your subscription to close this session.
              </p>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={closeSessionOpen}
          onOpenChange={(open) => {
            if (!open && !closingSession) {
              setCloseSessionOpen(false);
              setCloseSessionError(null);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Close session?</DialogTitle>
              <DialogDescription className="space-y-2 pt-2 text-left">
                <span className="block">
                  This action will permanently delete {session.course_code} — {session.title} and all
                  associated data.
                </span>
                <span className="block">
                  This includes students, attendance records, tests, scores, assignments, submissions,
                  and activity logs related to this class session.
                </span>
                <span className="block">This action cannot be undone.</span>
              </DialogDescription>
            </DialogHeader>
            {closeSessionError && <p className="text-sm text-destructive">{closeSessionError}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setCloseSessionOpen(false)}
                disabled={closingSession}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleCloseSession()}
                disabled={closingSession}
              >
                {closingSession ? "Closing..." : "Close Session"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>

      <TabsContent value="students">
        {canWrite ? (
        <Card className={cn(lecturerPortalCardClass, "mb-4")}>
          <CardHeader><CardTitle className="text-base">Add Manual Student</CardTitle></CardHeader>
          <CardContent>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(event) => void addManualStudent(event)}
            >
              <div className="min-w-[200px] flex-1 space-y-1">
                <Label htmlFor="manual-student-name">Full name</Label>
                <Input
                  id="manual-student-name"
                  placeholder="e.g. Jane Doe"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  disabled={addingManual}
                  maxLength={120}
                />
              </div>
              <div className="min-w-[160px] flex-1 space-y-1">
                <Label htmlFor="manual-student-college-id">College ID</Label>
                <Input
                  id="manual-student-college-id"
                  placeholder="Optional"
                  value={manualCollegeId}
                  onChange={(e) => setManualCollegeId(e.target.value)}
                  disabled={addingManual}
                  maxLength={50}
                />
              </div>
              <Button type="submit" disabled={addingManual}>
                {addingManual ? "Adding..." : "Add Student"}
              </Button>
            </form>
            {manualError && <p className="mt-2 text-sm text-destructive">{manualError}</p>}
          </CardContent>
        </Card>
        ) : (
          <Card className={cn(lecturerPortalCardClass, "mb-4 border-amber-200 bg-amber-50")}>
            <CardContent className="py-4 text-sm text-amber-900">
              Your account is in read-only mode. Renew your subscription to add students.
            </CardContent>
          </Card>
        )}
        <StudentPerformanceExportButton
          sessionId={session.id}
          rows={studentRows}
          testCount={testCount}
          assignmentCount={initialClassAssignments.length}
          disabled={studentRows.length === 0}
        />
        <div className="w-full overflow-x-auto rounded-lg border bg-white">
          <Table className="w-full min-w-[52rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 min-w-[3rem] whitespace-nowrap px-3 py-3 text-center">
                  No.
                </TableHead>
                <TableHead className="min-w-[11rem] whitespace-nowrap px-4 py-3">
                  Name
                </TableHead>
                <TableHead className="min-w-[6.5rem] whitespace-nowrap px-4 py-3">
                  College ID
                </TableHead>
                <TableHead className="w-[5.5rem] min-w-[5.5rem] whitespace-nowrap px-3 py-3 text-center">
                  Attendance %
                </TableHead>
                <TableHead className="min-w-[8rem] whitespace-nowrap px-4 py-3 text-center">
                  Total Classes Attended
                </TableHead>
                {initialClassAssignments.length <= 1 ? (
                  <TableHead className="min-w-[6.5rem] whitespace-nowrap px-4 py-3 text-center">
                    Assignment
                  </TableHead>
                ) : (
                  <>
                    <TableHead className="min-w-[6.5rem] whitespace-nowrap px-4 py-3 text-center">
                      Assignment 1
                    </TableHead>
                    <TableHead className="min-w-[6.5rem] whitespace-nowrap px-4 py-3 text-center">
                      Assignment 2
                    </TableHead>
                  </>
                )}
                <CaTestTableHeaders testCount={testCount} />
                <TableHead className="min-w-[5.5rem] whitespace-nowrap px-4 py-3 text-center">
                  Total C.A
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentRows.map((r, index) => (
                <TableRow key={r.enrollmentId}>
                  <TableCell className="px-3 py-3 text-center align-middle tabular-nums text-sm text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle">
                    <span className="font-medium">{r.name}</span>
                    {r.isManual && (
                      <Badge variant="secondary" className="ml-2">
                        Manual
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle font-mono text-sm">
                    {r.collegeId ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-center align-middle text-sm font-medium tabular-nums">
                    {formatPercent(r.attendancePercentage)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center align-middle tabular-nums text-muted-foreground">
                    {r.totalAttendance}/{r.totalSessions}
                  </TableCell>
                  {initialClassAssignments.length <= 1 ? (
                    <TableCell className="px-4 py-3 text-center align-middle tabular-nums">
                      {r.assignmentDisplays[0] ?? "-"}
                    </TableCell>
                  ) : (
                    <>
                      <TableCell className="px-4 py-3 text-center align-middle tabular-nums">
                        {r.assignmentDisplays[0] ?? "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center align-middle tabular-nums">
                        {r.assignmentDisplays[1] ?? "-"}
                      </TableCell>
                    </>
                  )}
                  <CaTestTableCells
                    testCount={testCount}
                    test1Display={r.test1Display}
                    test2Display={r.test2Display}
                  />
                  <TableCell className="px-4 py-3 text-center align-middle">
                    <Badge variant="accent">{r.totalCADisplay}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="attendance">
        <AttendanceSessionPanel
          session={session}
          rows={studentRows}
          initialActiveSession={initialActiveSession}
          initialSessionNumber={initialSessionNumber}
          onAttendanceChange={scheduleRefreshStudentRows}
          readOnly={!canWrite}
        />
      </TabsContent>

      <TabsContent value="assignments">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Create new assignments or grade student submissions.
            </p>
            <Button
              disabled={!canWrite}
              aria-disabled={!allowCreateAssignment}
              className={!allowCreateAssignment ? "pointer-events-auto opacity-50" : undefined}
              onClick={handleCreateAssignmentClick}
            >
              Create Assignment
            </Button>
          </div>
          {assignmentLimitMessage && (
            <p className="text-sm text-destructive">{assignmentLimitMessage}</p>
          )}

          {assignments.length === 0 ? (
            <Card className={lecturerPortalCardClass}>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No assignments yet. Use Create Assignment to add one.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {assignments.map((assignment) => {
                const assignmentOpen = !isPastDeadline(assignment.deadline);
                return (
                <li key={assignment.id} className="rounded-lg border bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{assignment.title}</p>
                        <AssignmentOpenClosedBadge isOpen={assignmentOpen} />
                      </div>
                      {assignment.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{assignment.description}</p>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground">
                        <AssignmentDeadline value={assignment.deadline} prefix="Due " /> · Max score:{" "}
                        {Number(assignment.max_score)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/lecturer/sessions/${session.id}/assignments/${assignment.id}`}>
                          Grade submissions
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Delete ${assignment.title}`}
                        onClick={() => {
                          setDeleteAssignmentError(null);
                          setDeleteAssignmentTarget(assignment);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
              })}
            </ul>
          )}
        </div>

        <Dialog
          open={deleteAssignmentTarget !== null}
          onOpenChange={(open) => {
            if (!open && !deletingAssignment) {
              setDeleteAssignmentTarget(null);
              setDeleteAssignmentError(null);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Delete {deleteAssignmentTarget?.title ?? "assignment"}?
              </DialogTitle>
              <DialogDescription className="space-y-2 pt-2 text-left">
                <span className="block">Are you sure you want to delete this assignment?</span>
                <span className="block">This action cannot be undone.</span>
                <span className="block">
                  All student submissions, PDF files, and grades for this assignment will be
                  permanently removed.
                </span>
              </DialogDescription>
            </DialogHeader>
            {deleteAssignmentError && (
              <p className="text-sm text-destructive">{deleteAssignmentError}</p>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setDeleteAssignmentTarget(null)}
                disabled={deletingAssignment}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleDeleteAssignment()}
                disabled={deletingAssignment}
              >
                {deletingAssignment ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>

      <TabsContent value="ca" className="mt-8 max-lg:mt-12 max-lg:pt-2 lg:mt-2">
        <CaStructurePanel
          session={session}
          semester={semester}
          initialWeights={initialCaWeights}
          initialClassTests={initialClassTests}
          readOnly={!canWrite}
          onWeightsChange={handleCaWeightsChange}
          onCaConfigSaved={handleCaConfigSaved}
        />
      </TabsContent>

      <TabsContent value="audit">
        {showAuditLogs ? (
          <SessionAuditPanel
            classSessionId={session.id}
            attendanceSessions={attendanceAuditSessions}
            presentBySession={attendancePresentBySession}
            auditLogs={sessionAuditLogs}
          />
        ) : null}
      </TabsContent>
    </Tabs>
  );
}
