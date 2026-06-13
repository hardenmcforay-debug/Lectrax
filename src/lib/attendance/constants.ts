/** How long each QR token remains valid (seconds). Matches refresh interval — only one token valid at a time. */
export const QR_TOKEN_TTL_SECONDS = 20;

/** How often the lecturer UI refreshes the displayed QR code (milliseconds). */
export const QR_REFRESH_INTERVAL_MS = 20_000;

/** Default overall attendance collection window (minutes). */
export const DEFAULT_SESSION_DURATION_MINUTES = 15;

/** Minimum/maximum attendance collection window (minutes). */
export const MIN_SESSION_DURATION_MINUTES = 5;
export const MAX_SESSION_DURATION_MINUTES = 60;

/** Every selectable session length from 5 through 60 minutes. */
export const SESSION_DURATION_OPTIONS: number[] = Array.from(
  { length: MAX_SESSION_DURATION_MINUTES - MIN_SESSION_DURATION_MINUTES + 1 },
  (_, index) => MIN_SESSION_DURATION_MINUTES + index
);

export function formatSessionDurationLabel(minutes: number): string {
  const defaultTag =
    minutes === DEFAULT_SESSION_DURATION_MINUTES ? " (default)" : "";
  return `${minutes} min${defaultTag}`;
}

/** Shown when a student scans a screenshot, photo, or any non-current QR token. */
export const EXPIRED_QR_MESSAGE =
  "This QR code has expired. Please scan the current QR code.";

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
