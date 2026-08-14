-- Close Advisor findings: mutable search_path, anon/authenticated EXECUTE on
-- SECURITY DEFINER functions, and public listing of landing-assets.
-- Idempotent. Does not change app features; only who may call privileged SQL.

-- -----------------------------------------------------------------------------
-- 1. Pin search_path on functions the linter flagged (and close cousins).
--    Email lookups keep auth,public so they can read auth.users.
-- -----------------------------------------------------------------------------
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
        'get_server_time',
        'update_updated_at',
        'generate_session_code',
        'set_session_code',
        'sync_enrollment_college_id',
        'lecturer_has_active_subscription',
        'lecturer_has_writable_subscription',
        'next_class_test_number',
        'student_owns_submission_storage_path',
        'lecturer_owns_submission_storage_path',
        'assignment_id_from_submission_storage_path',
        'get_my_role',
        'is_platform_admin',
        'lecturer_owns_class_session',
        'student_enrolled_in_class_session',
        'lecturer_owns_assignment',
        'lecturer_can_read_student_profile',
        'is_assignment_before_deadline',
        'get_assignment_deadline_status',
        'handle_new_user',
        'prevent_self_role_change',
        'enforce_assignment_submission_before_deadline',
        'lock_submissions_on_assignment_deadline_change',
        'lock_expired_assignment_submissions',
        'claim_payment_for_activation',
        'release_payment_activation_claim',
        'admin_completed_payment_totals',
        'verify_student_attendance_device',
        'register_student_attendance_device',
        'transfer_student_attendance_device',
        'mark_attendance_from_verified_scan'
      ])
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Service-role-only email lookups (were executable by anon in production).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_auth_email_registered(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = lower(trim(check_email))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(check_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT id
    FROM auth.users
    WHERE lower(email) = lower(trim(check_email))
    LIMIT 1
  );
END;
$$;

ALTER FUNCTION public.is_auth_email_registered(TEXT) OWNER TO postgres;
ALTER FUNCTION public.get_auth_user_id_by_email(TEXT) OWNER TO postgres;

-- -----------------------------------------------------------------------------
-- 3. Payment claim/release: service_role only (defense in depth + grants).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_payment_for_activation(p_payment_id uuid)
RETURNS TABLE (
  claimed boolean,
  already_completed boolean,
  payment_id uuid,
  lecturer_id uuid,
  billing_plan public.billing_plan,
  current_status public.payment_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    claimed := false;
    already_completed := false;
    payment_id := p_payment_id;
    lecturer_id := NULL;
    billing_plan := NULL;
    current_status := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  payment_id := v_payment.id;
  lecturer_id := v_payment.lecturer_id;
  billing_plan := v_payment.billing_plan;
  current_status := v_payment.status;

  IF v_payment.status = 'completed' THEN
    claimed := false;
    already_completed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_payment.status = 'processing' THEN
    claimed := false;
    already_completed := false;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_payment.status <> 'pending' THEN
    claimed := false;
    already_completed := false;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.payments
  SET status = 'processing'
  WHERE id = p_payment_id;

  claimed := true;
  already_completed := false;
  current_status := 'processing';
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_payment_activation_claim(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.payments
  SET status = 'pending'
  WHERE id = p_payment_id
    AND status = 'processing';
END;
$$;

ALTER FUNCTION public.claim_payment_for_activation(uuid) OWNER TO postgres;
ALTER FUNCTION public.release_payment_activation_claim(uuid) OWNER TO postgres;

-- -----------------------------------------------------------------------------
-- 4. Deadline RPCs: do not reveal another class's deadline to random users.
--    Service role (server) still sees the real value.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_assignment_deadline_status(p_assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline timestamptz;
  v_allowed boolean;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF coalesce(auth.role(), '') = 'service_role' THEN
    v_allowed := true;
  ELSIF auth.uid() IS NULL THEN
    v_allowed := false;
  ELSE
    v_allowed := EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = p_assignment_id
        AND a.lecturer_id = auth.uid()
    ) OR EXISTS (
      SELECT 1
      FROM public.assignments a
      JOIN public.enrollments e ON e.class_session_id = a.class_session_id
      WHERE a.id = p_assignment_id
        AND e.student_id = auth.uid()
    );
  END IF;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object(
      'server_time', NOW(),
      'deadline', NULL,
      'before_deadline', false
    );
  END IF;

  SELECT deadline INTO v_deadline
  FROM public.assignments
  WHERE id = p_assignment_id;

  IF v_deadline IS NULL THEN
    RETURN jsonb_build_object(
      'server_time', NOW(),
      'deadline', NULL,
      'before_deadline', false
    );
  END IF;

  RETURN jsonb_build_object(
    'server_time', NOW(),
    'deadline', v_deadline,
    'before_deadline', NOW() <= v_deadline
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_assignment_before_deadline(p_assignment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline timestamptz;
  v_allowed boolean;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF coalesce(auth.role(), '') = 'service_role' THEN
    v_allowed := true;
  ELSIF auth.uid() IS NULL THEN
    v_allowed := false;
  ELSE
    v_allowed := EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = p_assignment_id
        AND a.lecturer_id = auth.uid()
    ) OR EXISTS (
      SELECT 1
      FROM public.assignments a
      JOIN public.enrollments e ON e.class_session_id = a.class_session_id
      WHERE a.id = p_assignment_id
        AND e.student_id = auth.uid()
    );
  END IF;

  IF NOT v_allowed THEN
    RETURN false;
  END IF;

  SELECT deadline INTO v_deadline
  FROM public.assignments
  WHERE id = p_assignment_id;

  IF v_deadline IS NULL THEN
    RETURN false;
  END IF;

  RETURN NOW() <= v_deadline;
END;
$$;

ALTER FUNCTION public.get_assignment_deadline_status(uuid) OWNER TO postgres;
ALTER FUNCTION public.is_assignment_before_deadline(uuid) OWNER TO postgres;

-- -----------------------------------------------------------------------------
-- 5. Revoke PUBLIC/anon/authenticated from every flagged function, then
--    grant back only what RLS or the signed-in app still needs.
-- -----------------------------------------------------------------------------
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
        'is_auth_email_registered',
        'get_auth_user_id_by_email',
        'claim_payment_for_activation',
        'release_payment_activation_claim',
        'lock_expired_assignment_submissions',
        'get_assignment_deadline_status',
        'is_assignment_before_deadline',
        'admin_completed_payment_totals',
        'get_my_role',
        'is_platform_admin',
        'handle_new_user',
        'prevent_self_role_change',
        'sync_enrollment_college_id',
        'enforce_assignment_submission_before_deadline',
        'lock_submissions_on_assignment_deadline_change',
        'lecturer_has_active_subscription',
        'lecturer_has_writable_subscription',
        'lecturer_owns_assignment',
        'lecturer_owns_class_session',
        'student_enrolled_in_class_session',
        'lecturer_can_read_student_profile',
        'mark_attendance_from_verified_scan',
        'register_student_attendance_device',
        'transfer_student_attendance_device',
        'verify_student_attendance_device',
        'get_server_time',
        'update_updated_at',
        'generate_session_code',
        'set_session_code',
        'next_class_test_number',
        'student_owns_submission_storage_path',
        'lecturer_owns_submission_storage_path',
        'assignment_id_from_submission_storage_path'
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

  -- Signed-in app + RLS (never anon).
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'get_my_role',
        'is_platform_admin',
        'lecturer_owns_class_session',
        'student_enrolled_in_class_session',
        'lecturer_owns_assignment',
        'lecturer_can_read_student_profile',
        'is_assignment_before_deadline',
        'student_owns_submission_storage_path',
        'lecturer_owns_submission_storage_path',
        'assignment_id_from_submission_storage_path',
        'verify_student_attendance_device',
        'register_student_attendance_device',
        'transfer_student_attendance_device',
        'mark_attendance_from_verified_scan',
        'get_server_time',
        'admin_completed_payment_totals'
      ])
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.is_auth_email_registered IS
  'Service-role only. Signup duplicate check; not callable by anon/authenticated.';
COMMENT ON FUNCTION public.get_auth_user_id_by_email IS
  'Service-role only. Phone-login preparation; not callable by anon/authenticated.';
COMMENT ON FUNCTION public.lock_expired_assignment_submissions IS
  'Service-role / trigger only. Not granted to anon or authenticated.';

-- Auth trigger may run as supabase_auth_admin.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Public landing bucket: public URLs still work; listing must not.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read landing assets" ON storage.objects;
