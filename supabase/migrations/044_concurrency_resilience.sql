-- =============================================================================
-- 044_concurrency_resilience.sql
-- Concurrency hardening: single active attendance session, payment activation claims
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. One active attendance session per class + lecturer (race-safe session start)
-- -----------------------------------------------------------------------------
WITH ranked_active AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY class_session_id, lecturer_id
      ORDER BY created_at DESC
    ) AS rn
  FROM public.attendance_sessions
  WHERE is_active = true
    AND ended_at IS NULL
)
UPDATE public.attendance_sessions AS s
SET
  is_active = false,
  ended_at = COALESCE(s.ended_at, NOW()),
  qr_expires_at = NOW(),
  qr_token_hash = 'closed:' || s.id::text
FROM ranked_active AS r
WHERE s.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_attendance_session_per_class
  ON public.attendance_sessions (class_session_id, lecturer_id)
  WHERE is_active = true AND ended_at IS NULL;

-- -----------------------------------------------------------------------------
-- 2. Payment processing status for activation claims
-- -----------------------------------------------------------------------------
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'processing';

-- -----------------------------------------------------------------------------
-- 3. Atomic payment activation claim (prevents double webhook / poll activation)
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
  UPDATE public.payments
  SET status = 'pending'
  WHERE id = p_payment_id
    AND status = 'processing';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_payment_for_activation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_payment_activation_claim(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_payment_for_activation(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_payment_activation_claim(uuid) TO service_role;
