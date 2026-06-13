-- Lecturers may delete activity log entries for their own class sessions.
-- Attendance session records are stored separately and are not affected.

DROP POLICY IF EXISTS "Lecturer delete session audit logs" ON audit_logs;
CREATE POLICY "Lecturer delete session audit logs"
ON audit_logs
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM class_sessions cs
    WHERE cs.id = audit_logs.class_session_id
      AND cs.lecturer_id = auth.uid()
  )
);
