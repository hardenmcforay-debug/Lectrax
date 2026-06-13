"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { AuditLog } from "@/types/database";
import { Button } from "@/components/ui/button";
import { SessionActivityLogList } from "@/components/lecturer/session-activity-log-list";
import { SessionAttendanceSessionsList } from "@/components/lecturer/session-attendance-sessions-list";

import type { AttendancePresentStudent } from "@/lib/lecturer/attendance-sessions";

export type SessionAttendanceAudit = {
  id: string;
  title: string | null;
  session_date: string;
  created_at: string;
  ended_at: string | null;
  session_expires_at: string;
  recordCount: number;
};

export function SessionAuditPanel({
  classSessionId,
  attendanceSessions,
  presentBySession = {},
  auditLogs,
}: {
  classSessionId: string;
  attendanceSessions: SessionAttendanceAudit[];
  presentBySession?: Record<string, AttendancePresentStudent[]>;
  auditLogs: Pick<AuditLog, "id" | "action" | "entity_type" | "created_at">[];
}) {
  const [showAttendanceSessions, setShowAttendanceSessions] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <Button
          type="button"
          variant="outline"
          className="h-auto w-full justify-between px-4 py-3 sm:w-auto sm:min-w-[16rem]"
          onClick={() => setShowAttendanceSessions((open) => !open)}
          aria-expanded={showAttendanceSessions}
        >
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Attendance Sessions
            <span className="text-muted-foreground">({attendanceSessions.length})</span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              showAttendanceSessions ? "rotate-180" : ""
            }`}
          />
        </Button>

        {showAttendanceSessions && (
          <div className="mt-4">
            <SessionAttendanceSessionsList
              classSessionId={classSessionId}
              sessions={attendanceSessions}
              initialPresentBySession={presentBySession}
            />
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-4 text-base font-semibold">Activity Log</h3>
        <SessionActivityLogList classSessionId={classSessionId} initialLogs={auditLogs} />
      </div>
    </div>
  );
}
