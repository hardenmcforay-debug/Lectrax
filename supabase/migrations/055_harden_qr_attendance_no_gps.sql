-- Harden QR attendance (RLS bypass closed; atomic mark RPC; device transfer caps).
-- GPS remain optional when attendance_sessions.require_gps is true.
-- 1) Close student direct INSERT bypass on attendance_records
-- 2) Verified mark path via SECURITY DEFINER RPC (defense in depth)
-- 3) Strong device-identifier authorization + daily transfer cap

-- ---------------------------------------------------------------------------
-- 1. Students must not INSERT attendance_records directly (QR bypass).
--    Manual lecturer inserts keep their existing policy.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Student mark via service" ON public.attendance_records;

-- ---------------------------------------------------------------------------
-- 2. Atomic verified mark — called only after API HMAC + device checks.
--    Re-validates session open, class binding, enrollment, GPS (when required), uniqueness.
-- ---------------------------------------------------------------------------
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
  p_qr_token_hash TEXT,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL
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

  -- Class binding: token payload class must match the live session row.
  IF v_session.class_session_id IS DISTINCT FROM p_class_session_id THEN
    RAISE EXCEPTION 'Attendance session class mismatch' USING ERRCODE = '22023';
  END IF;

  IF v_session.is_active IS NOT TRUE
     OR v_session.ended_at IS NOT NULL
     OR v_session.session_expires_at <= NOW() THEN
    RAISE EXCEPTION 'Attendance collection has ended' USING ERRCODE = 'P0001';
  END IF;

  IF v_session.require_gps IS TRUE
     AND (p_latitude IS NULL OR p_longitude IS NULL) THEN
    RAISE EXCEPTION 'Location is required to mark attendance for this session' USING ERRCODE = '22023';
  END IF;

  IF p_latitude IS NOT NULL AND (p_latitude < -90 OR p_latitude > 90) THEN
    RAISE EXCEPTION 'Invalid latitude' USING ERRCODE = '22023';
  END IF;

  IF p_longitude IS NOT NULL AND (p_longitude < -180 OR p_longitude > 180) THEN
    RAISE EXCEPTION 'Invalid longitude' USING ERRCODE = '22023';
  END IF;

  -- Current rotating token only (replay / screenshot after rotation).
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
    latitude,
    longitude,
    scan_metadata
  ) VALUES (
    p_attendance_session_id,
    p_enrollment_id,
    p_class_session_id,
    'device_verified',
    p_device_fingerprint,
    p_latitude,
    p_longitude,
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
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_attendance_from_verified_scan(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Device verify: strong UUID identifier alone authorizes (fingerprint upgrade safe)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_student_attendance_device(
  p_device_fingerprint TEXT,
  p_browser_fingerprint TEXT,
  p_device_identifier TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_active RECORD;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF public.get_my_role() IS DISTINCT FROM 'student' THEN
    RETURN 'not_student';
  END IF;

  PERFORM set_config('row_security', 'off', true);

  IF EXISTS (
    SELECT 1
    FROM public.device_registrations
    WHERE is_attendance_authority = true
      AND archived_at IS NULL
      AND student_id <> v_student_id
      AND (
        device_fingerprint = p_device_fingerprint
        OR device_identifier = p_device_identifier
      )
  ) THEN
    RETURN 'device_owned_by_other';
  END IF;

  SELECT *
  INTO v_active
  FROM public.device_registrations
  WHERE student_id = v_student_id
    AND is_attendance_authority = true
    AND archived_at IS NULL
  LIMIT 1;

  IF v_active IS NULL THEN
    RETURN 'no_device';
  END IF;

  -- Stable local UUID is the primary binding after GPS removal.
  IF v_active.device_identifier IS NOT NULL
     AND length(trim(v_active.device_identifier)) >= 32
     AND v_active.device_identifier = p_device_identifier THEN
    RETURN 'authorized';
  END IF;

  IF v_active.device_fingerprint = p_device_fingerprint
     AND v_active.device_identifier = p_device_identifier THEN
    RETURN 'authorized';
  END IF;

  IF v_active.device_fingerprint = p_device_fingerprint
     AND v_active.browser_fingerprint = p_browser_fingerprint THEN
    RETURN 'authorized';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.device_registrations
    WHERE student_id = v_student_id
      AND archived_at IS NOT NULL
      AND (
        device_fingerprint = p_device_fingerprint
        OR device_identifier = p_device_identifier
      )
  ) THEN
    RETURN 'revoked_device';
  END IF;

  RETURN 'new_device';
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Cap device transfers (anti account-sharing hop) — 3 / rolling 24h
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_student_attendance_device(
  p_device_fingerprint TEXT,
  p_browser_fingerprint TEXT,
  p_device_identifier TEXT,
  p_device_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_old RECORD;
  v_new_id UUID;
  v_transfer_id UUID;
  v_transfers_24h INTEGER;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF public.get_my_role() IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Only students can transfer attendance devices' USING ERRCODE = '42501';
  END IF;

  IF p_device_fingerprint IS NULL OR length(trim(p_device_fingerprint)) < 8
     OR p_browser_fingerprint IS NULL OR length(trim(p_browser_fingerprint)) < 8
     OR p_device_identifier IS NULL OR length(trim(p_device_identifier)) < 8 THEN
    RAISE EXCEPTION 'Invalid device identity' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('row_security', 'off', true);

  SELECT COUNT(*)::INTEGER
  INTO v_transfers_24h
  FROM public.attendance_device_transfers
  WHERE student_id = v_student_id
    AND transferred_at > NOW() - INTERVAL '24 hours';

  IF v_transfers_24h >= 3 THEN
    RAISE EXCEPTION 'ATTENDANCE_DEVICE_TRANSFER_LIMIT' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.device_registrations
    WHERE is_attendance_authority = true
      AND archived_at IS NULL
      AND student_id <> v_student_id
      AND (
        device_fingerprint = p_device_fingerprint
        OR device_identifier = p_device_identifier
      )
  ) THEN
    RAISE EXCEPTION 'DEVICE_OWNED_BY_OTHER_ACCOUNT' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_old
  FROM public.device_registrations
  WHERE student_id = v_student_id
    AND is_attendance_authority = true
    AND archived_at IS NULL
  FOR UPDATE;

  IF v_old IS NULL THEN
    RAISE EXCEPTION 'No active attendance device to transfer from' USING ERRCODE = '22023';
  END IF;

  IF v_old.device_fingerprint = p_device_fingerprint
     AND v_old.device_identifier = p_device_identifier THEN
    RAISE EXCEPTION 'This device is already the authorized attendance device' USING ERRCODE = '22023';
  END IF;

  UPDATE public.device_registrations
  SET
    is_attendance_authority = false,
    archived_at = NOW(),
    updated_at = NOW()
  WHERE id = v_old.id;

  INSERT INTO public.device_registrations (
    student_id,
    device_fingerprint,
    browser_fingerprint,
    device_identifier,
    device_metadata,
    is_attendance_authority,
    is_verified,
    last_used_at
  ) VALUES (
    v_student_id,
    p_device_fingerprint,
    p_browser_fingerprint,
    p_device_identifier,
    COALESCE(p_device_metadata, '{}'::jsonb),
    true,
    true,
    NOW()
  )
  ON CONFLICT (student_id, device_fingerprint) DO UPDATE SET
    browser_fingerprint = EXCLUDED.browser_fingerprint,
    device_identifier = EXCLUDED.device_identifier,
    device_metadata = EXCLUDED.device_metadata,
    is_attendance_authority = true,
    is_verified = true,
    archived_at = NULL,
    last_used_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_new_id;

  INSERT INTO public.attendance_device_transfers (
    student_id,
    from_device_registration_id,
    to_device_registration_id,
    from_fingerprint,
    to_fingerprint,
    from_device_identifier,
    to_device_identifier,
    metadata
  ) VALUES (
    v_student_id,
    v_old.id,
    v_new_id,
    v_old.device_fingerprint,
    p_device_fingerprint,
    v_old.device_identifier,
    p_device_identifier,
    COALESCE(p_device_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_attendance_device_transfers_student_recent
  ON public.attendance_device_transfers (student_id, transferred_at DESC);
