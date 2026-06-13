-- Fix lecturer viewing enrolled students (RLS on enrollments + profiles)

CREATE OR REPLACE FUNCTION public.lecturer_can_read_student_profile(p_student_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  RETURN EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.class_sessions cs ON cs.id = e.class_session_id
    WHERE e.student_id = p_student_id
      AND cs.lecturer_id = auth.uid()
  );
END;
$$;

ALTER FUNCTION public.lecturer_can_read_student_profile(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.lecturer_can_read_student_profile(uuid) TO authenticated;

DROP POLICY IF EXISTS "Lecturers read enrolled students" ON public.profiles;

CREATE POLICY "Lecturers read enrolled students" ON public.profiles
  FOR SELECT
  USING (public.lecturer_can_read_student_profile(id));

DROP POLICY IF EXISTS "Lecturer manage enrollments" ON public.enrollments;

CREATE POLICY "Lecturer manage enrollments" ON public.enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.class_sessions cs
      WHERE cs.id = enrollments.class_session_id
        AND cs.lecturer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.class_sessions cs
      WHERE cs.id = enrollments.class_session_id
        AND cs.lecturer_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
