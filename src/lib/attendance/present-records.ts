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
  const merged = new Map(local);
  for (const [enrollmentId, method] of server) {
    if (!merged.has(enrollmentId)) {
      merged.set(enrollmentId, method);
      continue;
    }
    const existing = merged.get(enrollmentId)!;
    if (isQrLockedAttendance(method) || !isQrLockedAttendance(existing)) {
      merged.set(enrollmentId, method);
    }
  }
  return merged;
}
