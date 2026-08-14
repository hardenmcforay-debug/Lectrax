-- Lock 059 attendance RPCs: Supabase grants EXECUTE to anon/authenticated on
-- CREATE FUNCTION even after REVOKE FROM PUBLIC. Idempotent.

CREATE OR REPLACE FUNCTION public.attendance_counts_by_enrollment(p_class_session_id uuid)
RETURNS TABLE (enrollment_id uuid, attended_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT ar.enrollment_id, COUNT(*)::bigint AS attended_count
  FROM public.attendance_records ar
  WHERE ar.class_session_id = p_class_session_id
    AND ar.enrollment_id IN (
      SELECT e.id
      FROM public.enrollments e
      WHERE e.class_session_id = p_class_session_id
    )
  GROUP BY ar.enrollment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.attendance_counts_for_enrollments(p_enrollment_ids uuid[])
RETURNS TABLE (enrollment_id uuid, attended_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT ar.enrollment_id, COUNT(*)::bigint AS attended_count
  FROM public.attendance_records ar
  WHERE p_enrollment_ids IS NOT NULL
    AND cardinality(p_enrollment_ids) > 0
    AND ar.enrollment_id = ANY (p_enrollment_ids)
  GROUP BY ar.enrollment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.attendance_session_counts_by_class(p_class_session_ids uuid[])
RETURNS TABLE (class_session_id uuid, session_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT s.class_session_id, COUNT(*)::bigint AS session_count
  FROM public.attendance_sessions s
  WHERE p_class_session_ids IS NOT NULL
    AND cardinality(p_class_session_ids) > 0
    AND s.class_session_id = ANY (p_class_session_ids)
  GROUP BY s.class_session_id;
END;
$$;

DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'attendance_counts_by_enrollment',
        'attendance_counts_for_enrollments',
        'attendance_session_counts_by_class',
        'lecturer_attendance_class_totals'
      ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXCEPTION
      WHEN undefined_object THEN NULL;
    END;
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
    EXCEPTION
      WHEN undefined_object THEN NULL;
    END;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO postgres, service_role', fn);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.lecturer_attendance_class_totals(uuid) TO authenticated;
