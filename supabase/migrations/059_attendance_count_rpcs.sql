-- Count attendance in SQL instead of downloading every mark to the app.
-- Used by the class CA table, student academic overview, and lecturer dashboard chart.
-- Service-role counters are not callable by anon/authenticated (see also 060).

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

CREATE OR REPLACE FUNCTION public.lecturer_attendance_class_totals(p_lecturer_id uuid)
RETURNS TABLE (
  class_session_id uuid,
  course_code text,
  attendance_session_count bigint,
  attendance_record_count bigint,
  enrollment_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_lecturer_id IS NULL OR p_lecturer_id IS DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH my_classes AS (
    SELECT cs.id, cs.course_code
    FROM public.class_sessions cs
    WHERE cs.lecturer_id = p_lecturer_id
  )
  SELECT
    mc.id,
    mc.course_code,
    COALESCE(sess.cnt, 0),
    COALESCE(rec.cnt, 0),
    COALESCE(enr.cnt, 0)
  FROM my_classes mc
  LEFT JOIN (
    SELECT a.class_session_id, COUNT(*)::bigint AS cnt
    FROM public.attendance_sessions a
    WHERE a.class_session_id IN (SELECT id FROM my_classes)
    GROUP BY a.class_session_id
  ) sess ON sess.class_session_id = mc.id
  LEFT JOIN (
    SELECT ar.class_session_id, COUNT(*)::bigint AS cnt
    FROM public.attendance_records ar
    WHERE ar.class_session_id IN (SELECT id FROM my_classes)
    GROUP BY ar.class_session_id
  ) rec ON rec.class_session_id = mc.id
  LEFT JOIN (
    SELECT e.class_session_id, COUNT(*)::bigint AS cnt
    FROM public.enrollments e
    WHERE e.class_session_id IN (SELECT id FROM my_classes)
    GROUP BY e.class_session_id
  ) enr ON enr.class_session_id = mc.id;
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

COMMENT ON FUNCTION public.attendance_counts_by_enrollment(uuid) IS
  'Service-role only. Per-enrollment attendance totals for one class (CA table).';
COMMENT ON FUNCTION public.attendance_counts_for_enrollments(uuid[]) IS
  'Service-role only. Per-enrollment attendance totals for a student overview.';
COMMENT ON FUNCTION public.attendance_session_counts_by_class(uuid[]) IS
  'Service-role only. Attendance-session counts per class.';
COMMENT ON FUNCTION public.lecturer_attendance_class_totals(uuid) IS
  'Authenticated lecturer only (auth.uid must match). Dashboard attendance rates.';
