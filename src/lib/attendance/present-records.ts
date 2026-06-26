import type { AttendanceMarkMethod } from "@/types/database";

/** enrollmentId → how attendance was recorded for the active session */
export type PresentRecordMap = Map<string, AttendanceMarkMethod>;

export const QR_LOCK_MESSAGE =
  "This student marked attendance through QR scanning and cannot be removed from the Manual Attendance panel.";

export function normalizeMarkMethod(value: string): AttendanceMarkMethod {
  if (value === "manual") return "manual";
  if (value === "device_verified") return "device_verified";
  return "qr_scan";
}

export function isQrLockedAttendance(method: AttendanceMarkMethod): boolean {
  return method === "qr_scan" || method === "device_verified";
}

export function presentRecordMapFromStudents(
  students: { enrollmentId: string; markMethod: string }[]
): PresentRecordMap {
  return new Map(
    students.map((student) => [
      student.enrollmentId,
      normalizeMarkMethod(student.markMethod),
    ])
  );
}

export function addPresentRecord(
  prev: PresentRecordMap,
  enrollmentId: string,
  method: AttendanceMarkMethod
): PresentRecordMap {
  if (prev.has(enrollmentId)) return prev;
  const next = new Map(prev);
  next.set(enrollmentId, method);
  return next;
}

export function removePresentRecord(
  prev: PresentRecordMap,
  enrollmentId: string
): PresentRecordMap {
  const method = prev.get(enrollmentId);
  if (!method || isQrLockedAttendance(method)) return prev;
  const next = new Map(prev);
  next.delete(enrollmentId);
  return next;
}

export function mergePresentRecords(
  local: PresentRecordMap,
  server: PresentRecordMap
): PresentRecordMap {
  const merged = new Map(server);

  for (const [enrollmentId, method] of local) {
    if (method !== "manual" || server.has(enrollmentId)) continue;
    merged.set(enrollmentId, method);
  }

  return merged;
}

/** Build present map from server truth plus in-flight manual mark/unmark operations. */
export function buildPresentRecordsWithPending(
  server: PresentRecordMap,
  pendingMarks: ReadonlySet<string>,
  pendingUnmarks: ReadonlySet<string>
): PresentRecordMap {
  const merged = new Map(server);

  for (const enrollmentId of pendingMarks) {
    if (!pendingUnmarks.has(enrollmentId) && !merged.has(enrollmentId)) {
      merged.set(enrollmentId, "manual");
    }
  }

  for (const enrollmentId of pendingUnmarks) {
    const method = merged.get(enrollmentId);
    if (method && !isQrLockedAttendance(method)) {
      merged.delete(enrollmentId);
    }
  }

  return merged;
}
