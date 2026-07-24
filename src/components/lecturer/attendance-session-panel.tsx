"use client";

import { appFetch } from "@/lib/api/client-fetch";
import { isAbortError } from "@/lib/errors/classify";

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
  PRESENT_COUNT_POLL_FALLBACK_MS,
  PRESENT_COUNT_POLL_INTERVAL_MS,
  QR_REFRESH_INTERVAL_MS,
  SESSION_DURATION_OPTIONS,
} from "@/lib/attendance/constants";
import { endAttendanceSessionOnUnload } from "@/lib/attendance/end-on-unload";
import {
  addPresentRecord,
  buildPresentRecordsWithPending,
  isQrLockedAttendance,
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
const DEBUG_QR_REFRESH = process.env.NODE_ENV === "development";

function logQrRefresh(source: string, detail?: Record<string, unknown>) {
  if (!DEBUG_QR_REFRESH) return;
  console.debug("[QrRefresh]", { source, at: new Date().toISOString(), ...detail });
}

function logPresentRecords(source: string, records: PresentRecordMap, detail?: Record<string, unknown>) {
  if (!DEBUG_ATTENDANCE_COUNT) return;
  console.debug("[AttendanceCount]", {
    source,
    presentCount: records.size,
    records: Object.fromEntries(records),
    ...detail,
  });
}

function formatStudentNameWithId(name: string, collegeId: string | null): string {
  const trimmedId = collegeId?.trim();
  if (!trimmedId) return name;
  return `${name} (${trimmedId})`;
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
  const [ending, setEnding] = useState(false);
  const attendanceActionInFlightRef = useRef(false);
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
  const refreshQrRef = useRef<
    (attendanceSessionId: string, source?: string) => Promise<boolean>
  >(async () => false);
  const syncPresentRecordsRef = useRef<
    (attendanceSessionId: string, source: string) => Promise<void>
  >(async () => {});
  const presentLoadedForSessionRef = useRef<string | null>(null);
  const pendingManualMarksRef = useRef<Set<string>>(new Set());
  const pendingManualUnmarksRef = useRef<Set<string>>(new Set());
  const skipInitialRefreshRef = useRef(false);
  const realtimeConnectedRef = useRef(false);

  const activeSessionId = activeSession?.id ?? null;
  const endingOnUnloadRef = useRef(false);

  const presentCount = presentRecords.size;
  const totalStudents = rows.length;
  const notMarkedCount = Math.max(0, totalStudents - presentCount);

  useEffect(() => {
    if (!activeSessionId) return;

    endingOnUnloadRef.current = false;

    const endBecauseAppClosed = () => {
      if (endingOnUnloadRef.current) return;
      endingOnUnloadRef.current = true;
      endAttendanceSessionOnUnload(activeSessionId);
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      // bfcache freeze — page can be restored; do not end.
      if (event.persisted) return;
      endBecauseAppClosed();
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", endBecauseAppClosed);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", endBecauseAppClosed);
    };
  }, [activeSessionId]);

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
    try {
      const res = await appFetch(
        `/api/lecturer/sessions/${session.id}/attendance-sessions/${attendanceSessionId}/present`
      );
      const data = (await res.json()) as {
        students?: { enrollmentId: string; markMethod: string }[];
      };
      if (!res.ok || !data.students) return null;
      return presentRecordMapFromStudents(data.students);
    } catch (error) {
      if (isAbortError(error)) return null;
      throw error;
    }
  }, [session.id]);

  const syncPresentRecords = useCallback(
    async (attendanceSessionId: string, source: string) => {
      const serverRecords = await fetchPresentRecords(attendanceSessionId);
      if (!serverRecords) return;

      const merged = buildPresentRecordsWithPending(
        serverRecords,
        pendingManualMarksRef.current,
        pendingManualUnmarksRef.current,
      );
      logPresentRecords(source, merged);
      setPresentRecords(merged);
    },
    [fetchPresentRecords]
  );

  syncPresentRecordsRef.current = syncPresentRecords;

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
    async (attendanceSessionId: string, source = "unknown") => {
      if (refreshingRef.current) {
        logQrRefresh("skipped:in-flight", { attendanceSessionId, source });
        return false;
      }
      refreshingRef.current = true;
      logQrRefresh("start", { attendanceSessionId, source });

      try {
        const res = await appFetch("/api/attendance/refresh", {
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
          setQrExpiresAt(Date.now() + QR_REFRESH_INTERVAL_MS);
          logQrRefresh("failed", { attendanceSessionId, source, status: res.status });
          return false;
        }

        void renderQr(data.qrPayload);
        const nextExpiresAt = data.tokenExpiresAt
          ? new Date(data.tokenExpiresAt).getTime()
          : Date.now() + QR_REFRESH_INTERVAL_MS;
        setQrExpiresAt(nextExpiresAt);
        if (data.sessionExpiresAt) {
          setActiveSession((prev) => {
            if (!prev || prev.session_expires_at === data.sessionExpiresAt) return prev;
            return { ...prev, session_expires_at: data.sessionExpiresAt! };
          });
        }
        setError(null);
        logQrRefresh("success", {
          attendanceSessionId,
          source,
          tokenExpiresAt: data.tokenExpiresAt ?? new Date(nextExpiresAt).toISOString(),
        });
        void syncPresentRecordsRef.current(attendanceSessionId, "qr-refresh");
        return true;
      } catch {
        setError("Network error while refreshing QR code.");
        setQrExpiresAt(Date.now() + QR_REFRESH_INTERVAL_MS);
        logQrRefresh("error", { attendanceSessionId, source });
        return false;
      } finally {
        refreshingRef.current = false;
      }
    },
    [renderQr, router]
  );

  refreshQrRef.current = refreshQr;

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      logQrRefresh("timer:cleared", { timerId: refreshTimerRef.current });
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleNextRefresh = useCallback(
    (attendanceSessionId: string, expiresAt: number) => {
      clearRefreshTimer();
      const delay = Math.max(0, expiresAt - Date.now());
      logQrRefresh("timer:scheduled", {
        attendanceSessionId,
        delayMs: delay,
        expiresAt: new Date(expiresAt).toISOString(),
      });
      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        void refreshQrRef.current(attendanceSessionId, "interval");
      }, delay);
    },
    [clearRefreshTimer]
  );

  useEffect(() => {
    if (!activeSessionId) return;

    if (skipInitialRefreshRef.current) {
      skipInitialRefreshRef.current = false;
      return;
    }

    void refreshQrRef.current(activeSessionId, "session-open");
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId || !qrExpiresAt) return;

    scheduleNextRefresh(activeSessionId, qrExpiresAt);

    return clearRefreshTimer;
  }, [activeSessionId, qrExpiresAt, scheduleNextRefresh, clearRefreshTimer]);

  useEffect(() => {
    return clearRefreshTimer;
  }, [clearRefreshTimer]);

  useEffect(() => {
    if (!activeSession) return;
    if (presentLoadedForSessionRef.current === activeSession.id) return;

    presentLoadedForSessionRef.current = activeSession.id;
    void syncPresentRecords(activeSession.id, "loadPresentStudents:initial");
  }, [activeSession, syncPresentRecords]);

  useEffect(() => {
    if (!activeSession) return;

    const supabase = createClient();
    const attendanceSessionId = activeSession.id;
    const classSessionId = session.id;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const applyPresentInsert = (enrollmentId: string, markMethod: string | undefined) => {
      const method = normalizeMarkMethod(markMethod ?? "qr_scan");

      setPresentRecords((prev) => {
        if (prev.has(enrollmentId)) return prev;
        const next = addPresentRecord(prev, enrollmentId, method);
        logPresentRecords("realtime:insert", next, { enrollmentId, method });
        return next;
      });
      onAttendanceChange?.();
    };

    const applyPresentRemove = (enrollmentId: string) => {
      setPresentRecords((prev) => {
        const next = removePresentRecord(prev, enrollmentId);
        logPresentRecords("realtime:delete", next, { enrollmentId });
        return next;
      });
      onAttendanceChange?.();
    };

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      channel = supabase
        .channel(`attendance-records-${attendanceSessionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "attendance_records",
            filter: `class_session_id=eq.${classSessionId}`,
          },
          (payload) => {
            const row = payload.new as {
              attendance_session_id?: string;
              enrollment_id?: string;
              mark_method?: string;
            };
            if (row.attendance_session_id !== attendanceSessionId) return;

            const enrollmentId = row.enrollment_id;
            if (!enrollmentId) return;

            applyPresentInsert(enrollmentId, row.mark_method);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "attendance_records",
            filter: `class_session_id=eq.${classSessionId}`,
          },
          (payload) => {
            const row = payload.old as {
              attendance_session_id?: string;
              enrollment_id?: string;
            };
            if (row.attendance_session_id !== attendanceSessionId) return;

            const enrollmentId = row.enrollment_id;
            if (!enrollmentId) return;

            applyPresentRemove(enrollmentId);
          }
        )
        .subscribe((status) => {
          realtimeConnectedRef.current = status === "SUBSCRIBED";
          if (DEBUG_ATTENDANCE_COUNT) {
            console.debug("[AttendanceCount] realtime:status", {
              attendanceSessionId,
              status,
            });
          }
        });
    })();

    return () => {
      cancelled = true;
      realtimeConnectedRef.current = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [activeSession, session.id, onAttendanceChange]);

  useEffect(() => {
    if (!activeSession) return;

    const attendanceSessionId = activeSession.id;
    const runPoll = () => {
      void syncPresentRecordsRef.current(attendanceSessionId, "poll");
    };

    const fastPollId = window.setInterval(() => {
      if (realtimeConnectedRef.current) return;
      runPoll();
    }, PRESENT_COUNT_POLL_INTERVAL_MS);

    const fallbackPollId = window.setInterval(() => {
      if (!realtimeConnectedRef.current) return;
      runPoll();
    }, PRESENT_COUNT_POLL_FALLBACK_MS);

    return () => {
      window.clearInterval(fastPollId);
      window.clearInterval(fallbackPollId);
    };
  }, [activeSession]);

  async function startAttendance() {
    if (starting || ending || attendanceActionInFlightRef.current) return;
    attendanceActionInFlightRef.current = true;
    setError(null);
    setNotice(null);
    setStarting(true);

    try {
      const res = await appFetch("/api/attendance/start", {
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
      pendingManualMarksRef.current.clear();
      pendingManualUnmarksRef.current.clear();
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
      attendanceActionInFlightRef.current = false;
      setStarting(false);
    }
  }

  async function endAttendance() {
    if (!activeSession || ending || starting || attendanceActionInFlightRef.current) return;
    attendanceActionInFlightRef.current = true;

    const endedSessionId = activeSession.id;
    setError(null);
    setNotice(null);
    setEnding(true);

    setActiveSession(null);
    setQrImage(null);
    setQrExpiresAt(null);
    setActiveSessionDurationMinutes(null);
    setPresentRecords(new Map());
    presentLoadedForSessionRef.current = null;
    pendingManualMarksRef.current.clear();
    pendingManualUnmarksRef.current.clear();
    onAttendanceChange?.();

    try {
      const res = await appFetch("/api/attendance/end", {
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
    } finally {
      attendanceActionInFlightRef.current = false;
      setEnding(false);
    }
  }

  async function markManual(enrollmentId: string) {
    if (!activeSession) return;
    if (presentRecords.has(enrollmentId)) return;
    if (pendingManualMarksRef.current.has(enrollmentId)) return;

    pendingManualUnmarksRef.current.delete(enrollmentId);
    pendingManualMarksRef.current.add(enrollmentId);

    setNotice(null);
    setPresentRecords((prev) => {
      const next = addPresentRecord(prev, enrollmentId, "manual");
      logPresentRecords("manual:optimistic", next, { enrollmentId });
      return next;
    });
    onAttendanceChange?.();

    try {
      const res = await appFetch("/api/attendance/manual", {
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
        pendingManualMarksRef.current.delete(enrollmentId);
        await syncPresentRecords(activeSession.id, "manual:duplicate-sync");
        onAttendanceChange?.();
        return;
      }

      if (!res.ok) {
        pendingManualMarksRef.current.delete(enrollmentId);
        setPresentRecords((prev) => removePresentRecord(prev, enrollmentId));
        onAttendanceChange?.();
        setError(data.error ?? "Could not mark student present.");
        return;
      }

      pendingManualMarksRef.current.delete(enrollmentId);
      await syncPresentRecords(activeSession.id, "manual:confirmed");
      logPresentRecords("manual:confirmed", presentRecords, { enrollmentId });
    } catch {
      pendingManualMarksRef.current.delete(enrollmentId);
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
    if (!activeSession || !unmarkTarget || unmarking) return;

    const { enrollmentId } = unmarkTarget;
    const method = presentRecords.get(enrollmentId);
    if (method && isQrLockedAttendance(method)) {
      setNotice(QR_LOCK_MESSAGE);
      setUnmarkTarget(null);
      return;
    }

    setUnmarking(true);
    setUnmarkTarget(null);

    pendingManualMarksRef.current.delete(enrollmentId);
    pendingManualUnmarksRef.current.add(enrollmentId);

    setPresentRecords((prev) => removePresentRecord(prev, enrollmentId));
    onAttendanceChange?.();

    let succeeded = false;

    try {
      const res = await appFetch("/api/attendance/manual", {
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
        return;
      }

      succeeded = true;
    } catch {
      setPresentRecords((prev) => addPresentRecord(prev, enrollmentId, "manual"));
      onAttendanceChange?.();
      setError("Network error. Could not remove attendance.");
    } finally {
      pendingManualUnmarksRef.current.delete(enrollmentId);
      if (succeeded) {
        await syncPresentRecords(activeSession.id, "manual:unmark-confirmed");
      }
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
                  <SelectContent>
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
              <Button
                onClick={() => void startAttendance()}
                loading={starting}
                disabled={ending}
                variant="accent"
              >
                Generate QR Code
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

              <Button
                variant="destructive"
                onClick={() => void endAttendance()}
                loading={ending}
                disabled={readOnly}
              >
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
              const studentLabel = formatStudentNameWithId(student.name, student.collegeId);

              return (
                <div key={student.enrollmentId} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{studentLabel}</span>
                  {isMarked ? (
                    isQr ? (
                      <Button
                        type="button"
                        size="sm"
                        className="cursor-default bg-blue-600 text-white hover:bg-blue-600"
                        onClick={() =>
                          handlePresentControlClick(student.enrollmentId, studentLabel)
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
                          handlePresentControlClick(student.enrollmentId, studentLabel)
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
              loading={unmarking}
              onClick={() => void confirmUnmark()}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
