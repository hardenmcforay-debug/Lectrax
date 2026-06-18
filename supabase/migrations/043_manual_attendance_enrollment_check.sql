-- Require enrollment belongs to the class session when lecturers insert manual attendance.

DROP POLICY IF EXISTS "Lecturer insert manual attendance" ON public.attendance_records;

CREATE POLICY "Lecturer insert manual attendance" ON public.attendance_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.class_sessions cs
      WHERE cs.id = attendance_records.class_session_id
        AND cs.lecturer_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.id = attendance_records.enrollment_id
        AND e.class_session_id = attendance_records.class_session_id
    )
  );
