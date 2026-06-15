"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_SESSION_DURATION_MINUTES,
  formatAttendanceDate,
  formatAttendanceTime,
  formatSessionDurationLabel,
  SESSION_DURATION_OPTIONS,
} from "@/lib/attendance/constants";
import {
  addPresentRecord,
  isQrLockedAttendance,
  mergePresentRecords,
  normalizeMarkMethod,
  presentRecordMapFromStudents,
  QR_LOCK_MESSAGE,
  removePresentRecord,
  type PresentRecordMap,
} from "@/lib/attendance/present-records";
import type { ClassSession, StudentTableRow } from "@/types/database";
import { lecturerPortalCardClass } from "@/components/lecturer/lecturer-dashboard-styles";
import { QR_SIZE } from "@/lib/low-data/constants";

export type ActiveAttendanceSession = {
  id: string;
  title: string | null;
  session_date: string;
  created_at: string;
  session_expires_at: string;
};

const DEBUG_ATTENDANCE_COUNT = process.env.NODE_ENV === "development";

function logPresentRecords(source: string, records: PresentRecordMap, detail?: Record<string, unknown>) {
  if (!DEBUG_ATTENDANCE_COUNT) return;
  console.debug("[AttendanceCount]", {
    source,
    presentCount: records.size,
    records: Object.fromEntries(records),
    ...detail,
  });
}

export function AttendanceSessionPanel({
  session,
  rows,
  initialActiveSession = null,
  initialSessionNumber = null,
  onAttendanceChange,
  readOnly = false,
}: {
  session: ClassSession;
  rows: StudentTableRow[];
  initialActiveSession?: ActiveAttendanceSession | null;
  initialSessionNumber?: number | null;
  onAttendanceChange?: () => void;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [activeSession, setActiveSession] = useState<ActiveAttendanceSession | null>(
    initialActiveSession
  );
  const [sessionNumber, setSessionNumber] = useState<number | null>(initialSessionNumber);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrRendering, setQrRendering] = useState(false);
  const [presentRecords, setPresentRecords] = useState<PresentRecordMap>(new Map());
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(
    String(DEFAULT_SESSION_DURATION_MINUTES)
  );
  const [activeSessionDurationMinutes, setActiveSessionDurationMinutes] = useState<number | null>(
    null
  );
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
  const [qrVersion, setQrVersion] = useState(0);
  const [unmarkTarget, setUnmarkTarget] = useState<{
    enrollmentId: string;
    name: string;
  } | null>(null);
  const [unmarking, setUnmarking] = useState(false);
  const refreshTimerRef = useRef<number | null>(null);
  const refreshingRef = useRef(false);
  const presentLoadedForSessionRef = useRef<string | null>(null);
  const skipInitialRefreshRef = useRef(false);

  const presentCount = presentRecords.size;
  const totalStudents = rows.length;
  const notMarkedCount = Math.max(0, totalStudents - presentCount);

  useEffect(() => {
    if (!activeSession || activeSessionDurationMinutes) return;
    const start = new Date(activeSession.created_at).getTime();
    const end = new Date(activeSession.session_expires_at).getTime();
    const minutes = Math.round((end - start) / 60_000);
    if (minutes > 0) {
      setActiveSessionDurationMinutes(minutes);
    }
  }, [activeSession, activeSessionDurationMinutes]);

  const fetchPresentRecords = useCallback(async (attendanceSessionId: string) => {
    const res = await fetch(
      `/api/lecturer/sessions/${session.id}/attendance-sessions/${attendanceSessionId}/present`
    );
    const data = (await res.json()) as {
      students?: { enrollmentId: string; markMethod: string }[];
    };
    if (!res.ok || !data.students) return null;
    return presentRecordMapFromStudents(data.students);
  }, [session.id]);

  const syncPresentRecords = useCallback(
    async (attendanceSessionId: string, source: string) => {
      const serverRecords = await fetchPresentRecords(attendanceSessionId);
      if (!serverRecords) return;

      setPresentRecords((prev) => {
        const merged = prev.size === 0 ? serverRecords : mergePresentRecords(prev, serverRecords);
        logPresentRecords(source, merged);
        return merged;
      });
    },
    [fetchPresentRecords]
  );

  const renderQr = useCallback(async (qrPayload: string) => {
    setQrRendering(true);
    try {
      const { default: QRCode } = await import("qrcode");
      const img = await QRCode.toDataURL(qrPayload, { width: QR_SIZE, margin: 2 });
      setQrImage(img);
      setQrVersion((version) => version + 1);
    } finally {
      setQrRendering(false);
    }
  }, []);

  const refreshQr = useCallback(
    async (attendanceSessionId: string) => {
      if (refreshingRef.current) return false;
      refreshingRef.current = true;

      try {
        const res = await fetch("/api/attendance/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attendanceSessionId }),
        });

        const data = (await res.json().catch(() => ({}))) as {
          qrPayload?: string;
          sessionExpiresAt?: string;
          tokenExpiresAt?: string;
          error?: string;
        };

        if (res.status === 410) {
          setActiveSession(null);
          setQrImage(null);
          setQrExpiresAt(null);
          setPresentRecords(new Map());
          presentLoadedForSessionRef.current = null;
          setActiveSessionDurationMinutes(null);
          setError("Attendance session has ended.");
          router.refresh();
          return false;
        }

        if (!res.ok || !data.qrPayload) {
          setError(data.error ?? "Could not refresh QR code.");
          return false;
        }

        void renderQr(data.qrPayload);
        if (data.tokenExpiresAt) {
          setQrExpiresAt(new Date(data.tokenExpiresAt).getTime());
        }
        if (data.sessionExpiresAt) {
          setActiveSession((prev) =>
            prev ? { ...prev, session_expires_at: data.sessionExpiresAt! } : prev
          );
        }
        setError(null);
        return true;
      } catch {
        setError("Network error while refreshing QR code.");
        return false;
      } finally {
        refreshingRef.current = false;
      }
    },
    [renderQr, router]
  );

  useEffect(() => {
    if (!activeSession) return;

    if (skipInitialRefreshRef.current) {
      skipInitialRefreshRef.current = false;
    } else {
      void refreshQr(activeSession.id);
    }
  }, [activeSession, refreshQr]);

  useEffect(() => {
    if (!activeSession || !qrExpiresAt) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((qrExpiresAt - Date.now()) / 1000));
      if (remaining === 0) {
        void refreshQr(activeSession.id);
      }
    };

    tick();
    refreshTimerRef.current = window.setInterval(tick, 1000);

    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
    };
  }, [activeSession, qrExpiresAt, refreshQr]);

  useEffect(() => {
    if (!activeSession) return;
    if (presentLoadedForSessionRef.current === activeSession.id) return;

    presentLoadedForSessionRef.current = activeSession.id;
    void syncPresentRecords(activeSession.id, "loadPresentStudents:initial");
  }, [activeSession, syncPresentRecords]);

  useEffect(() => {
    if (!activeSession) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`attendance-records-${activeSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance_records",
          filter: `attendance_session_id=eq.${activeSession.id}`,
        },
        (payload) => {
          const row = payload.new as {
            enrollment_id?: string;
            mark_method?: string;
          };
          const enrollmentId = row.enrollment_id;
          if (!enrollmentId) return;

          const method = normalizeMarkMethod(row.mark_method ?? "qr_scan");

          setPresentRecords((prev) => {
            if (prev.has(enrollmentId)) return prev;
            const next = addPresentRecord(prev, enrollmentId, method);
            logPresentRecords("realtime:insert", next, { enrollmentId, method });
            return next;
          });
          onAttendanceChange?.();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeSession, onAttendanceChange]);

  async function startAttendance() {
    setError(null);
    setNotice(null);
    setStarting(true);

    try {
      const res = await fetch("/api/attendance/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classSessionId: session.id,
          durationMinutes: Number(durationMinutes),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        session?: ActiveAttendanceSession & { session_expires_at: string };
        sessionNumber?: number;
        qrPayload?: string;
        tokenExpiresAt?: string;
        error?: string;
      };

      if (!res.ok || !data.session?.id || !data.qrPayload) {
        setError(data.error ?? "Could not generate QR code. Please try again.");
        return;
      }

      presentLoadedForSessionRef.current = null;
      setPresentRecords(new Map());
      logPresentRecords("startAttendance", new Map());
      skipInitialRefreshRef.current = true;
      setActiveSessionDurationMinutes(Number(durationMinutes));
      setActiveSession({
        id: data.session.id,
        title: data.session.title,
        session_date: data.session.session_date,
        created_at: data.session.created_at,
        session_expires_at: data.session.session_expires_at,
      });
      setSessionNumber(data.sessionNumber ?? null);
      if (data.tokenExpiresAt) {
        setQrExpiresAt(new Date(data.tokenExpiresAt).getTime());
      }
      void renderQr(data.qrPayload);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }

  async function endAttendance() {
    if (!activeSession) return;

    const endedSessionId = activeSession.id;
    setError(null);
    setNotice(null);

    setActiveSession(null);
    setQrImage(null);
    setQrExpiresAt(null);
    setActiveSessionDurationMinutes(null);
    setPresentRecords(new Map());
    presentLoadedForSessionRef.current = null;
    onAttendanceChange?.();

    try {
      const res = await fetch("/api/attendance/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceSessionId: endedSessionId }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Could not end attendance session.");
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    }
  }

  async function markManual(enrollmentId: string) {
    if (!activeSession) return;
    if (presentRecords.has(enrollmentId)) return;

    setNotice(null);
    setPresentRecords((prev) => {
      const next = addPresentRecord(prev, enrollmentId, "manual");
      logPresentRecords("manual:optimistic", next, { enrollmentId });
      return next;
    });
    onAttendanceChange?.();

    try {
      const res = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceSessionId: activeSession.id,
          enrollmentId,
          classSessionId: session.id,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (res.status === 409) {
        await syncPresentRecords(activeSession.id, "manual:duplicate-sync");
        onAttendanceChange?.();
        return;
      }

      if (!res.ok) {
        setPresentRecords((prev) => removePresentRecord(prev, enrollmentId));
        onAttendanceChange?.();
        setError(data.error ?? "Could not mark student present.");
        return;
      }

      logPresentRecords("manual:confirmed", presentRecords, { enrollmentId });
    } catch {
      setPresentRecords((prev) => removePresentRecord(prev, enrollmentId));
      onAttendanceChange?.();
      setError("Network error. Could not mark student present.");
    }
  }

  function handlePresentControlClick(enrollmentId: string, studentName: string) {
    const method = presentRecords.get(enrollmentId);
    if (!method) return;

    setError(null);

    if (isQrLockedAttendance(method)) {
      setNotice(QR_LOCK_MESSAGE);
      return;
    }

    setNotice(null);
    setUnmarkTarget({ enrollmentId, name: studentName });
  }

  async function confirmUnmark() {
    if (!activeSession || !unmarkTarget) return;

    const { enrollmentId } = unmarkTarget;
    const method = presentRecords.get(enrollmentId);
    if (method && isQrLockedAttendance(method)) {
      setNotice(QR_LOCK_MESSAGE);
      setUnmarkTarget(null);
      return;
    }

    setUnmarking(true);
    setUnmarkTarget(null);

    setPresentRecords((prev) => removePresentRecord(prev, enrollmentId));
    onAttendanceChange?.();

    try {
      const res = await fetch("/api/attendance/manual", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceSessionId: activeSession.id,
          enrollmentId,
          classSessionId: session.id,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (res.status === 403) {
        setPresentRecords((prev) => addPresentRecord(prev, enrollmentId, "qr_scan"));
        onAttendanceChange?.();
        setNotice(data.error ?? QR_LOCK_MESSAGE);
        return;
      }

      if (!res.ok) {
        setPresentRecords((prev) => addPresentRecord(prev, enrollmentId, "manual"));
        onAttendanceChange?.();
        setError(data.error ?? "Could not remove attendance.");
      }
    } catch {
      setPresentRecords((prev) => addPresentRecord(prev, enrollmentId, "manual"));
      onAttendanceChange?.();
      setError("Network error. Could not remove attendance.");
    } finally {
      setUnmarking(false);
    }
  }

  const courseLabel = session.class_name
    ? `${session.course_code} — ${session.class_name}`
    : `${session.course_code} — ${session.title}`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className={lecturerPortalCardClass}>
        <CardHeader>
          <CardTitle>
            {activeSession ? "Active Attendance Session" : "Generate QR Code"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!activeSession ? (
            <>
              {readOnly ? (
                <p className="text-sm text-amber-800">
                  Your account is in read-only mode. Renew your subscription to start attendance.
                </p>
              ) : (
              <>
              <div className="space-y-2">
                <Label htmlFor="attendance-duration">Session duration</Label>
                <Select value={durationMinutes} onValueChange={setDurationMinutes}>
                  <SelectTrigger id="attendance-duration">
                    <SelectValue placeholder="Select duration (5–60 min)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    {SESSION_DURATION_OPTIONS.map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {formatSessionDurationLabel(minutes)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose how long students can check in. Default is 10 minutes.
                </p>
              </div>
              <Button onClick={() => void startAttendance()} disabled={starting} variant="accent">
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate QR Code"}
              </Button>
              </>
              )}
            </>
          ) : (
            <>
              <div className="rounded-lg border bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-foreground">
                  Attendance Session #{sessionNumber ?? "—"}
                </p>
                <p className="mt-2">
                  <span className="text-muted-foreground">Course:</span> {courseLabel}
                </p>
                <p>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {formatAttendanceDate(activeSession.created_at)}
                </p>
                <p>
                  <span className="text-muted-foreground">Time:</span>{" "}
                  {formatAttendanceTime(activeSession.created_at)}
                </p>
                <div className="mt-2">
                  <Badge variant="secondary">{presentCount} present</Badge>
                </div>
              </div>

              {qrRendering && !qrImage && (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="mt-2 text-xs text-muted-foreground">Generating QR code…</p>
                </div>
              )}

              {qrImage && (
                <div className="flex w-full flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic QR data URL refreshed in-session */}
                  <img
                    key={qrVersion}
                    src={qrImage}
                    alt="Attendance QR"
                    className="w-full max-w-[400px] rounded-lg border bg-white p-2 shadow-sm transition-opacity duration-300"
                  />
                  <p className="mt-3 max-w-[400px] text-center text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Attendance Window:</span>{" "}
                    {activeSessionDurationMinutes ?? durationMinutes} Minutes
                  </p>
                </div>
              )}

              <Button variant="destructive" onClick={() => void endAttendance()} disabled={readOnly}>
                End Attendance
              </Button>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {activeSession && (
        <Card className={lecturerPortalCardClass}>
          <CardHeader>
            <CardTitle>Manual Attendance</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 space-y-3 overflow-y-auto">
            <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
              <p>
                <span className="font-medium text-green-700">Present:</span> {presentCount}
              </p>
              <p>
                <span className="font-medium text-muted-foreground">Not Marked:</span>{" "}
                {notMarkedCount}
              </p>
              <p>
                <span className="font-medium">Total Students:</span> {totalStudents}
              </p>
            </div>
            {notice && <p className="text-sm text-amber-700">{notice}</p>}
            {rows.map((student) => {
              const markMethod = presentRecords.get(student.enrollmentId);
              const isMarked = markMethod !== undefined;
              const isQr = markMethod !== undefined && isQrLockedAttendance(markMethod);

              return (
                <div key={student.enrollmentId} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{student.name}</span>
                  {isMarked ? (
                    isQr ? (
                      <Button
                        type="button"
                        size="sm"
                        className="cursor-default bg-blue-600 text-white hover:bg-blue-600"
                        onClick={() =>
                          handlePresentControlClick(student.enrollmentId, student.name)
                        }
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        QR Verified
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-green-600 text-white hover:bg-green-700"
                        onClick={() =>
                          handlePresentControlClick(student.enrollmentId, student.name)
                        }
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Present
                      </Button>
                    )
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void markManual(student.enrollmentId)}
                    >
                      Mark Present
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={unmarkTarget !== null}
        onOpenChange={(open) => {
          if (!open && !unmarking) setUnmarkTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove attendance for this student?</DialogTitle>
            <DialogDescription>
              {unmarkTarget
                ? `This will remove ${unmarkTarget.name}'s manual attendance for the current session only.`
                : "This will remove manual attendance for the current session only."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={unmarking}
              onClick={() => setUnmarkTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={unmarking}
              onClick={() => void confirmUnmark()}
            >
              {unmarking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
