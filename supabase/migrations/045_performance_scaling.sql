-- =============================================================================
-- 045_performance_scaling.sql
-- Query performance indexes and admin revenue aggregation for scale
-- =============================================================================

-- Hot path: assignments by class session (student lists, session-data, lecturer UI)
CREATE INDEX IF NOT EXISTS idx_assignments_class_session
  ON public.assignments (class_session_id, is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_lecturer
  ON public.assignments (lecturer_id);

-- Hot path: test scores and attendance records by class session
CREATE INDEX IF NOT EXISTS idx_test_scores_class_semester
  ON public.test_scores (class_session_id, semester, academic_year);

CREATE INDEX IF NOT EXISTS idx_attendance_records_class_session
  ON public.attendance_records (class_session_id);

-- Admin / cron filters
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role);

CREATE INDEX IF NOT EXISTS idx_profiles_lecturer_subscription
  ON public.profiles (role, subscription_plan, subscription_status)
  WHERE role = 'lecturer';

CREATE INDEX IF NOT EXISTS idx_payments_lecturer_status
  ON public.payments (lecturer_id, status, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_completed_paid_at
  ON public.payments (paid_at DESC)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manual_students_class_session
  ON public.manual_students (class_session_id);

CREATE INDEX IF NOT EXISTS idx_class_tests_session_semester
  ON public.class_tests (class_session_id, semester, academic_year, test_number);

-- Aggregate completed payment revenue without loading all payment rows
CREATE OR REPLACE FUNCTION public.admin_completed_payment_totals()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total_revenue',
    COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0),
    'by_plan',
    COALESCE(
      (
        SELECT jsonb_object_agg(plan, plan_revenue)
        FROM (
          SELECT plan, SUM(amount) AS plan_revenue
          FROM payments
          WHERE status = 'completed'
          GROUP BY plan
        ) AS grouped
      ),
      '{}'::jsonb
    )
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_completed_payment_totals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_completed_payment_totals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_completed_payment_totals() TO service_role;
