import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { invalidSessionTokenHash } from "@/lib/attendance/qr-rotation";
import {
  isAttendanceSessionOpen,
  isLecturerAttendancePresenceStale,
} from "@/lib/attendance/constants";

type ClosableAttendanceSession = {
  id: string;
  class_session_id: string;
  is_active: boolean;
  ended_at: string | null;
  session_expires_at: string;
  qr_expires_at: string;
};

/** Persist a closed attendance session (manual end, expiry, or lecturer left). */
export async function persistAttendanceSessionClosed(
  service: SupabaseClient,
  session: Pick<ClosableAttendanceSession, "id">,
  endedAt: Date = new Date()
): Promise<string> {
  const endedAtIso = endedAt.toISOString();
  await service
    .from("attendance_sessions")
    .update({
      is_active: false,
      ended_at: endedAtIso,
      qr_token_hash: invalidSessionTokenHash(session.id),
      qr_expires_at: endedAtIso,
    })
    .eq("id", session.id)
    .is("ended_at", null);

  return endedAtIso;
}

/**
 * Close a session when the lecturer stopped refreshing the QR (app closed / killed)
 * or the scheduled duration elapsed. Returns true when the session was closed.
 */
export async function closeAttendanceSessionIfAbandoned(
  service: SupabaseClient,
  session: ClosableAttendanceSession
): Promise<boolean> {
  if (!session.is_active || session.ended_at) return false;

  const expired = !isAttendanceSessionOpen(session);
  const lecturerGone = isLecturerAttendancePresenceStale(session);

  if (!expired && !lecturerGone) return false;

  const endedAt = expired
    ? new Date(session.session_expires_at)
    : new Date();

  await persistAttendanceSessionClosed(service, session, endedAt);
  return true;
}
