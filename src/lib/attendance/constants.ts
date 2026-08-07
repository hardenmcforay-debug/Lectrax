/** How long each QR token remains valid (seconds). Matches refresh interval — only one token valid at a time. */
export const QR_TOKEN_TTL_SECONDS = 5;

/**
 * Server-side skew tolerance when comparing QR expiry timestamps.
 * Absorbs minor API↔DB clock drift and near-expiry network latency without
 * meaningfully widening the replay window (tokens still rotate every 5s).
 */
export const QR_TOKEN_CLOCK_SKEW_MS = 1_500;

/** Max attendance-device transfers per student in a rolling 24h window. */
export const MAX_ATTENDANCE_DEVICE_TRANSFERS_PER_24H = 3;

/** How often the lecturer UI refreshes the displayed QR code (milliseconds). */
export const QR_REFRESH_INTERVAL_MS = QR_TOKEN_TTL_SECONDS * 1000;

/**
 * If the lecturer stops refreshing the QR for this long, treat the session as abandoned
 * (app closed/killed). Slightly above a few missed refresh cycles to tolerate brief blips.
 */
export const LECTURER_ATTENDANCE_PRESENCE_GRACE_MS = 45_000;

/** How often the active-session present count is synced while collecting attendance. */
export const PRESENT_COUNT_POLL_INTERVAL_MS = QR_REFRESH_INTERVAL_MS;

/** Fallback poll interval when realtime is connected (safety net only). */
export const PRESENT_COUNT_POLL_FALLBACK_MS = 30_000;

export const QR_REFRESH_INTERVAL_SECONDS = QR_TOKEN_TTL_SECONDS;

/** Default overall attendance collection window (minutes). */
export const DEFAULT_SESSION_DURATION_MINUTES = 10;

/** Minimum/maximum attendance collection window (minutes). */
export const MIN_SESSION_DURATION_MINUTES = 5;
export const MAX_SESSION_DURATION_MINUTES = 60;

/** Selectable attendance window lengths for classroom sessions. */
export const SESSION_DURATION_OPTIONS: number[] = [5, 10, 15, 20, 30, 45, 60];

export function formatSessionDurationLabel(minutes: number): string {
  const defaultTag =
    minutes === DEFAULT_SESSION_DURATION_MINUTES ? " (default)" : "";
  return `${minutes} min${defaultTag}`;
}

export const EXPIRED_QR_TITLE = "QR Code Expired";

/** Shown when a student scans a screenshot, photo, or any non-current QR token. */
export const EXPIRED_QR_MESSAGE =
  "This QR code is no longer valid. Please scan the latest QR code displayed by your lecturer.";

export const ATTENDANCE_ALREADY_RECORDED_TITLE = "Attendance Already Recorded";

export const ATTENDANCE_ALREADY_RECORDED_MESSAGE =
  "Your attendance for this class session has already been successfully recorded.";

export const ATTENDANCE_RECORDED_TITLE = "Attendance Recorded Successfully";

export const ATTENDANCE_RECORDED_MESSAGE =
  "Your attendance has been successfully recorded.";

export function isAttendanceSessionOpen(session: {
  is_active: boolean;
  ended_at: string | null;
  session_expires_at: string;
}): boolean {
  if (!session.is_active || session.ended_at) return false;
  return new Date(session.session_expires_at) > new Date();
}

/** True when the lecturer is no longer rotating the live QR (typically app closed). */
export function isLecturerAttendancePresenceStale(session: {
  qr_expires_at: string;
}): boolean {
  const qrExpiresAt = new Date(session.qr_expires_at).getTime();
  if (Number.isNaN(qrExpiresAt)) return true;
  return Date.now() > qrExpiresAt + LECTURER_ATTENDANCE_PRESENCE_GRACE_MS;
}

export function formatAttendanceTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function formatAttendanceDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
