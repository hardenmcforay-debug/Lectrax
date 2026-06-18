import { appFetch } from "@/lib/api/client-fetch";
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import type { AuditLog } from "@/types/database";

type ActivityLog = Pick<AuditLog, "id" | "action" | "entity_type" | "created_at">;

export function SessionActivityLogList({
  classSessionId,
  initialLogs,
}: {
  classSessionId: string;
  initialLogs: ActivityLog[];
}) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [deleteTarget, setDeleteTarget] = useState<ActivityLog | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setError(null);
    setDeleting(true);

    try {
      const res = await appFetch(
        `/api/lecturer/sessions/${classSessionId}/audit-logs/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Could not delete activity log.");
        return;
      }

      setLogs((prev) => prev.filter((log) => log.id !== deleteTarget.id));
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAll() {
    setError(null);
    setDeletingAll(true);

    try {
      const res = await appFetch(`/api/lecturer/sessions/${classSessionId}/audit-logs`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Could not delete activity logs.");
        return;
      }

      setLogs([]);
      setDeleteAllOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeletingAll(false);
    }
  }

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity logged for this session yet.</p>;
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {logs.length} {logs.length === 1 ? "entry" : "entries"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            setError(null);
            setDeleteAllOpen(true);
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete All
        </Button>
      </div>

      <ul className="space-y-2">
        {logs.map((log) => (
          <li
            key={log.id}
            className="flex items-start justify-between gap-3 rounded-lg border bg-white px-4 py-3 text-sm"
          >
            <div>
              <span className="font-medium">{log.action.replace(/_/g, " ")}</span>
              <span className="text-muted-foreground"> — {log.entity_type}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {formatDate(log.created_at)}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Delete activity log: ${log.action}`}
              onClick={() => {
                setError(null);
                setDeleteTarget(log);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      {error && !deleteTarget && !deleteAllOpen && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}

      <Dialog
        open={deleteAllOpen}
        onOpenChange={(open) => {
          if (!open && !deletingAll) {
            setDeleteAllOpen(false);
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete all activity logs?</DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-left">
              <span className="block">
                Remove all {logs.length} activity log entries for this session?
              </span>
              <span className="block">
                Attendance session records will not be affected.
              </span>
              <span className="block">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          {error && deleteAllOpen && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteAllOpen(false)} disabled={deletingAll}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteAll()}
              disabled={deletingAll}
            >
              {deletingAll ? "Deleting..." : "Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete activity log?</DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-left">
              <span className="block">
                Remove this activity log entry? Attendance session records will not be affected.
              </span>
              <span className="block">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
