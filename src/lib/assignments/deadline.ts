/** True when the assignment deadline instant has passed (matches DB `NOW() > deadline`). */
export function isPastDeadline(deadline: string): boolean {
  const deadlineMs = new Date(deadline).getTime();
  if (Number.isNaN(deadlineMs)) return true;
  return Date.now() > deadlineMs;
}

/** Normalize any accepted deadline input to UTC ISO before persistence. */
export function normalizeAssignmentDeadline(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid assignment deadline.");
  }
  return date.toISOString();
}

/** Convert a `datetime-local` value to a UTC ISO string for TIMESTAMPTZ storage. */
export function localDateTimeInputToIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid assignment deadline.");
  }
  return date.toISOString();
}

/** Format a stored assignment deadline in the viewer's local timezone. */
export function formatAssignmentDeadline(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
