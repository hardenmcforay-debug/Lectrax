-- Bind each physical device to at most one student account for QR attendance.
-- Prevents a second student from registering, transferring, or scanning on a device
-- that already has an active attendance authority for another account.

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_student_per_attendance_device_fp
  ON public.device_registrations (device_fingerprint)
  WHERE is_attendance_authority = true AND archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_student_per_attendance_device_id
  ON public.device_registrations (device_identifier)
  WHERE is_attendance_authority = true
    AND archived_at IS NULL
    AND device_identifier IS NOT NULL
    AND length(trim(device_identifier)) > 0;

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

CREATE OR REPLACE FUNCTION public.register_student_attendance_device(
  p_device_fingerprint TEXT,
  p_browser_fingerprint TEXT,
  p_device_identifier TEXT,
  p_device_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_existing UUID;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF public.get_my_role() IS DISTINCT FROM 'student' THEN
    RETURN 'not_student';
  END IF;

  IF p_device_fingerprint IS NULL OR length(trim(p_device_fingerprint)) < 8
     OR p_browser_fingerprint IS NULL OR length(trim(p_browser_fingerprint)) < 8
     OR p_device_identifier IS NULL OR length(trim(p_device_identifier)) < 8 THEN
    RAISE EXCEPTION 'Invalid device identity' USING ERRCODE = '22023';
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

  SELECT id
  INTO v_existing
  FROM public.device_registrations
  WHERE student_id = v_student_id
    AND is_attendance_authority = true
    AND archived_at IS NULL
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN 'already_registered';
  END IF;

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
    updated_at = NOW();

  RETURN 'registered';
END;
$$;

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
