-- Remove GPS from QR attendance entirely.
-- Lectrax relies on auth, enrollment, QR token, device binding, session checks,
-- rate limits, and duplicate protection — not location.

-- ---------------------------------------------------------------------------
-- 1. Recreate mark RPC without latitude/longitude parameters or GPS checks
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mark_attendance_from_verified_scan(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION
);
DROP FUNCTION IF EXISTS public.mark_attendance_from_verified_scan(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.mark_attendance_from_verified_scan(
  p_attendance_session_id UUID,
  p_class_session_id UUID,
  p_enrollment_id UUID,
  p_device_fingerprint TEXT,
  p_browser_fingerprint TEXT,
  p_device_identifier TEXT,
  p_qr_token_hash TEXT
)
RETURNS TABLE (
  record_id UUID,
  marked_at TIMESTAMPTZ,
  already_recorded BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_session RECORD;
  v_enrollment_student UUID;
  v_existing_id UUID;
  v_existing_marked TIMESTAMPTZ;
  v_new_id UUID;
  v_new_marked TIMESTAMPTZ;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF public.get_my_role() IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Only students can mark QR attendance' USING ERRCODE = '42501';
  END IF;

  IF p_device_fingerprint IS NULL OR length(trim(p_device_fingerprint)) < 8
     OR p_browser_fingerprint IS NULL OR length(trim(p_browser_fingerprint)) < 8
     OR p_device_identifier IS NULL OR length(trim(p_device_identifier)) < 8
     OR p_qr_token_hash IS NULL OR length(trim(p_qr_token_hash)) < 32 THEN
    RAISE EXCEPTION 'Invalid attendance mark payload' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('row_security', 'off', true);

  SELECT *
  INTO v_session
  FROM public.attendance_sessions
  WHERE id = p_attendance_session_id
  FOR UPDATE;

  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Attendance session not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_session.class_session_id IS DISTINCT FROM p_class_session_id THEN
    RAISE EXCEPTION 'Attendance session class mismatch' USING ERRCODE = '22023';
  END IF;

  IF v_session.is_active IS NOT TRUE
     OR v_session.ended_at IS NOT NULL
     OR v_session.session_expires_at <= NOW() THEN
    RAISE EXCEPTION 'Attendance collection has ended' USING ERRCODE = 'P0001';
  END IF;

  IF v_session.qr_token_hash IS DISTINCT FROM p_qr_token_hash
     OR v_session.qr_expires_at < NOW() THEN
    RAISE EXCEPTION 'QR token is no longer valid' USING ERRCODE = 'P0001';
  END IF;

  SELECT student_id
  INTO v_enrollment_student
  FROM public.enrollments
  WHERE id = p_enrollment_id
    AND class_session_id = p_class_session_id;

  IF v_enrollment_student IS NULL OR v_enrollment_student IS DISTINCT FROM v_student_id THEN
    RAISE EXCEPTION 'Not enrolled in this class' USING ERRCODE = '42501';
  END IF;

  SELECT ar.id, ar.marked_at
  INTO v_existing_id, v_existing_marked
  FROM public.attendance_records ar
  WHERE ar.attendance_session_id = p_attendance_session_id
    AND ar.enrollment_id = p_enrollment_id;

  IF v_existing_id IS NOT NULL THEN
    record_id := v_existing_id;
    marked_at := v_existing_marked;
    already_recorded := true;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.attendance_records (
    attendance_session_id,
    enrollment_id,
    class_session_id,
    mark_method,
    device_fingerprint,
    scan_metadata
  ) VALUES (
    p_attendance_session_id,
    p_enrollment_id,
    p_class_session_id,
    'device_verified',
    p_device_fingerprint,
    jsonb_build_object(
      'scanned_at', NOW(),
      'browser_fingerprint', p_browser_fingerprint,
      'device_identifier', p_device_identifier,
      'source', 'verified_scan_rpc'
    )
  )
  ON CONFLICT (attendance_session_id, enrollment_id) DO NOTHING
  RETURNING id, marked_at INTO v_new_id, v_new_marked;

  IF v_new_id IS NULL THEN
    SELECT ar.id, ar.marked_at
    INTO v_existing_id, v_existing_marked
    FROM public.attendance_records ar
    WHERE ar.attendance_session_id = p_attendance_session_id
      AND ar.enrollment_id = p_enrollment_id;

    record_id := v_existing_id;
    marked_at := v_existing_marked;
    already_recorded := true;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.device_registrations
  SET last_used_at = NOW(), updated_at = NOW()
  WHERE student_id = v_student_id
    AND device_fingerprint = p_device_fingerprint
    AND is_attendance_authority = true
    AND archived_at IS NULL;

  record_id := v_new_id;
  marked_at := v_new_marked;
  already_recorded := false;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_attendance_from_verified_scan(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_attendance_from_verified_scan(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Drop GPS columns from attendance tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.attendance_sessions
  DROP COLUMN IF EXISTS require_gps,
  DROP COLUMN IF EXISTS gps_radius_meters;

ALTER TABLE public.attendance_records
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude;
