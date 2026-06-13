-- Fix lecturer adding manual students (RLS WITH CHECK + table grants)

DROP POLICY IF EXISTS "Lecturer manage manual students" ON public.manual_students;

CREATE POLICY "Lecturer manage manual students" ON public.manual_students
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.class_sessions cs
      WHERE cs.id = manual_students.class_session_id
        AND cs.lecturer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.class_sessions cs
      WHERE cs.id = manual_students.class_session_id
        AND cs.lecturer_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_students TO authenticated;
