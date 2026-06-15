/** How long each QR token remains valid (seconds). Matches refresh interval — only one token valid at a time. */
export const QR_TOKEN_TTL_SECONDS = 60;

/** How often the lecturer UI refreshes the displayed QR code (milliseconds). */
export const QR_REFRESH_INTERVAL_MS = QR_TOKEN_TTL_SECONDS * 1000;

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

export function formatAttendanceTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAttendanceDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
