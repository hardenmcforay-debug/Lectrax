-- Fix lecturer class session creation (RLS, grants, class_name column)

ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS class_name TEXT;

ALTER TABLE public.class_sessions
  DROP COLUMN IF EXISTS description;

COMMENT ON COLUMN public.class_sessions.class_name IS
  'Program or class group, e.g. Pre BSc in Nursing';

DROP POLICY IF EXISTS "Lecturer CRUD own sessions" ON public.class_sessions;

CREATE POLICY "Lecturer CRUD own sessions" ON public.class_sessions
  FOR ALL
  USING (lecturer_id = auth.uid())
  WITH CHECK (lecturer_id = auth.uid());

DROP POLICY IF EXISTS "Admin read all sessions" ON public.class_sessions;

CREATE POLICY "Admin read all sessions" ON public.class_sessions
  FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Lecturer manage CA config" ON public.ca_configurations;

CREATE POLICY "Lecturer manage CA config" ON public.ca_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.class_sessions cs
      WHERE cs.id = ca_configurations.class_session_id
        AND cs.lecturer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.class_sessions cs
      WHERE cs.id = ca_configurations.class_session_id
        AND cs.lecturer_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ca_configurations TO authenticated;
