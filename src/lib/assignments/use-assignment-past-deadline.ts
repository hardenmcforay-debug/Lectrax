"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_TIMEOUT_MS = 2_147_483_647;

function pollIntervalMs(msUntilDeadline: number): number | null {
  if (msUntilDeadline <= 0) return null;
  if (msUntilDeadline <= 60_000) return 1_000;
  if (msUntilDeadline <= 15 * 60_000) return 5_000;
  return 15_000;
}

function isPastDeadlineWithOffset(deadline: string, serverOffsetMs: number): boolean {
  const deadlineMs = new Date(deadline).getTime();
  if (Number.isNaN(deadlineMs)) return true;
  return Date.now() + serverOffsetMs > deadlineMs;
}

async function fetchServerOffsetMs(): Promise<number> {
  const res = await fetch("/api/server-time", { cache: "no-store" });
  if (!res.ok) return 0;

  const body = (await res.json().catch(() => ({}))) as { serverTime?: string };
  if (!body.serverTime) return 0;

  const serverMs = new Date(body.serverTime).getTime();
  if (Number.isNaN(serverMs)) return 0;

  return serverMs - Date.now();
}

async function fetchAssignmentPastDeadline(assignmentId: string): Promise<boolean | null> {
  const res = await fetch(`/api/student/assignments/${assignmentId}/deadline-status`, {
    cache: "no-store",
  });
  if (!res.ok) return null;

  const body = (await res.json().catch(() => ({}))) as { pastDeadline?: boolean };
  return typeof body.pastDeadline === "boolean" ? body.pastDeadline : null;
}

/** Live deadline state synced to trusted server time; flips closed at the due instant. */
export function useAssignmentPastDeadline(
  deadline: string,
  options?: {
    assignmentId?: string;
    initialPastDeadline?: boolean;
    onDeadlinePassed?: () => void;
  }
): boolean {
  const onDeadlinePassedRef = useRef(options?.onDeadlinePassed);
  onDeadlinePassedRef.current = options?.onDeadlinePassed;

  const serverOffsetRef = useRef(0);

  const [pastDeadline, setPastDeadline] = useState(() => {
    if (options?.initialPastDeadline) return true;
    return isPastDeadlineWithOffset(deadline, 0);
  });

  const applyPastDeadline = useCallback((past: boolean) => {
    setPastDeadline((prev) => {
      if (!prev && past) {
        onDeadlinePassedRef.current?.();
      }
      return past;
    });
  }, []);

  useEffect(() => {
    const deadlineMs = new Date(deadline).getTime();
    if (Number.isNaN(deadlineMs)) return;

    let cancelled = false;

    const syncFromServer = async () => {
      if (options?.assignmentId) {
        const authoritative = await fetchAssignmentPastDeadline(options.assignmentId);
        if (!cancelled && authoritative !== null) {
          applyPastDeadline(authoritative);
          return;
        }
      }

      const offset = await fetchServerOffsetMs();
      if (!cancelled) {
        serverOffsetRef.current = offset;
        applyPastDeadline(isPastDeadlineWithOffset(deadline, offset));
      }
    };

    const syncLocal = () => {
      applyPastDeadline(isPastDeadlineWithOffset(deadline, serverOffsetRef.current));
    };

    void syncFromServer();

    const msUntilDeadline = deadlineMs - (Date.now() + serverOffsetRef.current);
    const pollMs = pollIntervalMs(msUntilDeadline);
    const intervalId = pollMs ? window.setInterval(() => void syncFromServer(), pollMs) : undefined;
    const localTickId = window.setInterval(syncLocal, 1_000);

    let timeoutId: number | undefined;
    if (msUntilDeadline > 0) {
      timeoutId = window.setTimeout(
        () => void syncFromServer(),
        Math.min(msUntilDeadline + 100, MAX_TIMEOUT_MS)
      );
    }

    const offsetSyncId = window.setInterval(() => void syncFromServer(), 60_000);

    return () => {
      cancelled = true;
      if (intervalId !== undefined) window.clearInterval(intervalId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      window.clearInterval(localTickId);
      window.clearInterval(offsetSyncId);
    };
  }, [applyPastDeadline, deadline, options?.assignmentId]);

  return pastDeadline;
}
