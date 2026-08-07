"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { AuditLog } from "@/types/database";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/shared/table-pagination";
import { SessionActivityLogList } from "@/components/lecturer/session-activity-log-list";
import { SessionAttendanceSessionsList } from "@/components/lecturer/session-attendance-sessions-list";
import { PAGINATION } from "@/lib/pagination";

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
  attendanceSessionsTotal = attendanceSessions.length,
  attendancePage = 1,
  presentBySession = {},
  auditLogs,
  auditLogsTotal = auditLogs.length,
  auditPage = 1,
}: {
  classSessionId: string;
  attendanceSessions: SessionAttendanceAudit[];
  attendanceSessionsTotal?: number;
  attendancePage?: number;
  presentBySession?: Record<string, AttendancePresentStudent[]>;
  auditLogs: Pick<AuditLog, "id" | "action" | "entity_type" | "created_at">[];
  auditLogsTotal?: number;
  auditPage?: number;
}) {
  const [showAttendanceSessions, setShowAttendanceSessions] = useState(false);
  const basePath = `/lecturer/sessions/${classSessionId}`;

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
            <span className="text-muted-foreground">({attendanceSessionsTotal})</span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              showAttendanceSessions ? "rotate-180" : ""
            }`}
          />
        </Button>

        {showAttendanceSessions && (
          <div className="mt-4 space-y-4">
            <TablePagination
              basePath={basePath}
              page={attendancePage}
              pageSize={PAGINATION.DEFAULT_PAGE_SIZE}
              total={attendanceSessionsTotal}
              pageParam="attendancePage"
              preserveParams={{
                tab: "audit",
                auditPage: String(auditPage),
              }}
            />
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
        <div className="mb-4">
          <TablePagination
            basePath={basePath}
            page={auditPage}
            pageSize={PAGINATION.DEFAULT_PAGE_SIZE}
            total={auditLogsTotal}
            pageParam="auditPage"
            preserveParams={{
              tab: "audit",
              attendancePage: String(attendancePage),
            }}
          />
        </div>
        <SessionActivityLogList
          classSessionId={classSessionId}
          initialLogs={auditLogs}
          total={auditLogsTotal}
        />
      </div>
    </div>
  );
}
