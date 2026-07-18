/** Best-effort end of an attendance session when the lecturer closes the app/tab. */
export function endAttendanceSessionOnUnload(attendanceSessionId: string): void {
  if (typeof window === "undefined" || !attendanceSessionId) return;

  const payload = JSON.stringify({ attendanceSessionId });
  const url = "/api/attendance/end";

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) {
        return;
      }
    }
  } catch {
    // Fall through to keepalive fetch.
  }

  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
      credentials: "same-origin",
    });
  } catch {
    // Unload handlers must not throw.
  }
}
