-- Fix: infinite recursion in policy for relation "class_sessions"
-- Cycle: ca_configurations -> class_sessions -> enrollments -> class_sessions

CREATE OR REPLACE FUNCTION public.lecturer_owns_class_session(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  RETURN EXISTS (
    SELECT 1
    FROM public.class_sessions
    WHERE id = p_session_id
      AND lecturer_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.student_enrolled_in_class_session(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  RETURN EXISTS (
    SELECT 1
    FROM public.enrollments
    WHERE class_session_id = p_session_id
      AND student_id = auth.uid()
  );
END;
$$;

ALTER FUNCTION public.lecturer_owns_class_session(uuid) OWNER TO postgres;
ALTER FUNCTION public.student_enrolled_in_class_session(uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.lecturer_owns_class_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_enrolled_in_class_session(uuid) TO authenticated;

-- ca_configurations: stop subquery that re-enters class_sessions RLS
DROP POLICY IF EXISTS "Lecturer manage CA config" ON public.ca_configurations;

CREATE POLICY "Lecturer manage CA config" ON public.ca_configurations
  FOR ALL
  USING (public.lecturer_owns_class_session(class_session_id))
  WITH CHECK (public.lecturer_owns_class_session(class_session_id));

-- enrollments: break enrollments <-> class_sessions loop
DROP POLICY IF EXISTS "Lecturer manage enrollments" ON public.enrollments;

CREATE POLICY "Lecturer manage enrollments" ON public.enrollments
  FOR ALL
  USING (public.lecturer_owns_class_session(class_session_id))
  WITH CHECK (public.lecturer_owns_class_session(class_session_id));

-- class_sessions: student read without querying enrollments under RLS
DROP POLICY IF EXISTS "Students read joined sessions" ON public.class_sessions;

CREATE POLICY "Students read joined sessions" ON public.class_sessions
  FOR SELECT
  USING (public.student_enrolled_in_class_session(id));
