-- Fix students searching class sessions by session code (RLS was blocking lookup)

DROP POLICY IF EXISTS "Students search by session code" ON public.class_sessions;

CREATE POLICY "Students search by session code" ON public.class_sessions
  FOR SELECT
  USING (public.get_my_role() = 'student');

GRANT SELECT ON public.class_sessions TO authenticated;
GRANT SELECT, INSERT ON public.enrollments TO authenticated;
