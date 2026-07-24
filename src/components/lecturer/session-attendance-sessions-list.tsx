"use client";

import { appFetch } from "@/lib/api/client-fetch";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatAttendanceTime } from "@/lib/attendance/constants";
import { formatDate } from "@/lib/utils";
import type { SessionAttendanceAudit } from "@/components/lecturer/session-audit-panel";
import type { AttendancePresentStudent } from "@/lib/lecturer/attendance-sessions";

function formatMarkMethod(method: string): string {
  return method.replace(/_/g, " ");
}

function formatSessionTimeRange(session: SessionAttendanceAudit): string {
  const start = formatAttendanceTime(session.created_at);
  const end = session.ended_at ? formatAttendanceTime(session.ended_at) : "Open";
  return `${start} – ${end}`;
}

export function SessionAttendanceSessionsList({
  classSessionId,
  sessions,
  initialPresentBySession = {},
}: {
  classSessionId: string;
  sessions: SessionAttendanceAudit[];
  initialPresentBySession?: Record<string, AttendancePresentStudent[]>;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [presentBySession, setPresentBySession] = useState(initialPresentBySession);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPresentBySession(initialPresentBySession);
  }, [initialPresentBySession]);

  async function fetchPresentStudents(sessionId: string) {
    if (loadingId !== null) return;
    setLoadingId(sessionId);

    try {
      const res = await appFetch(
        `/api/lecturer/sessions/${classSessionId}/attendance-sessions/${sessionId}/present`
      );
      const data = (await res.json()) as {
        students?: AttendancePresentStudent[];
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Could not load present students.");
        return;
      }

      setPresentBySession((prev) => ({
        ...prev,
        [sessionId]: data.students ?? [],
      }));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoadingId(null);
    }
  }

  function toggleSession(sessionId: string) {
    const isCurrentlyExpanded = expandedIds.has(sessionId);

    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyExpanded) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });

    setError(null);

    if (isCurrentlyExpanded || sessionId in presentBySession) {
      return;
    }

    void fetchPresentStudents(sessionId);
  }

  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No attendance sessions recorded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <ul className="relative grid auto-rows-min grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => {
          const isExpanded = expandedIds.has(session.id);
          const isPreloaded = session.id in presentBySession;
          const presentStudents = presentBySession[session.id];
          const isLoading = loadingId === session.id;

          return (
            <li
              key={session.id}
              className={`relative self-start rounded-lg border bg-white ${
                isExpanded ? "z-30" : "z-0"
              }`}
            >
              <button
                type="button"
                className="relative z-10 flex w-full items-start gap-2 rounded-lg bg-white px-3 py-2.5 text-left hover:bg-slate-50"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleSession(session.id);
                }}
                aria-expanded={isExpanded}
                aria-controls={`attendance-session-panel-${session.id}`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium leading-tight">
                      {session.title ?? "Attendance Session"}
                    </p>
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{formatSessionTimeRange(session)}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.recordCount} present
                    {!session.ended_at && (
                      <span className="ml-1.5 text-amber-700">· Still open</span>
                    )}
                  </p>
                </div>
              </button>

              {isExpanded && (
                <div
                  id={`attendance-session-panel-${session.id}`}
                  className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white px-3 py-2 shadow-lg"
                >
                  {isLoading ? (
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  ) : !isPreloaded ? (
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  ) : presentStudents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No students marked present.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {presentStudents.map((student) => (
                        <li
                          key={student.enrollmentId}
                          className="rounded border bg-white px-2.5 py-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium">{student.name}</span>
                            <Badge
                              variant="secondary"
                              className="h-5 shrink-0 px-1.5 text-[10px] font-normal capitalize"
                            >
                              {formatMarkMethod(student.markMethod)}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {student.collegeId ? student.collegeId : "No ID"}
                            {" · "}
                            {formatDate(student.markedAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
