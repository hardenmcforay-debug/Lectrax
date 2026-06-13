-- Fix lecturer starting attendance sessions (RLS WITH CHECK + table grants)

DROP POLICY IF EXISTS "Lecturer manage attendance sessions" ON public.attendance_sessions;

CREATE POLICY "Lecturer manage attendance sessions" ON public.attendance_sessions
  FOR ALL
  USING (lecturer_id = auth.uid())
  WITH CHECK (lecturer_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;
