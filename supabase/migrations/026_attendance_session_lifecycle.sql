-- =============================================================================
-- 026_attendance_session_lifecycle.sql
-- SmartRoll QR attendance: session window vs rotating QR tokens
--
-- Run in Supabase SQL Editor (or via supabase db push) after migrations 001–025.
--
-- Adds:
--   session_expires_at  — overall attendance collection window (5–60 min)
--   ended_at            — when the lecturer closed the session
--
-- qr_expires_at         — expiry of the CURRENT QR token only (~20 seconds)
-- qr_token_hash         — hash of the ONE currently valid QR token
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. New columns
-- -----------------------------------------------------------------------------
ALTER TABLE public.attendance_sessions
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.attendance_sessions.session_expires_at IS
  'When the attendance collection window closes. Configurable 5–60 minutes from start.';

COMMENT ON COLUMN public.attendance_sessions.ended_at IS
  'When the lecturer ended attendance, or when the session was auto-closed after expiry.';

COMMENT ON COLUMN public.attendance_sessions.qr_expires_at IS
  'Expiry of the current rotating QR token (~20s). Replaced on each refresh.';

COMMENT ON COLUMN public.attendance_sessions.qr_token_hash IS
  'HMAC hash of the single currently valid QR token. Previous tokens are rejected immediately.';

-- -----------------------------------------------------------------------------
-- 2. Backfill existing rows (legacy data used qr_expires_at for the full window)
-- -----------------------------------------------------------------------------
UPDATE public.attendance_sessions
SET session_expires_at = COALESCE(session_expires_at, qr_expires_at, created_at + INTERVAL '15 minutes')
WHERE session_expires_at IS NULL;

UPDATE public.attendance_sessions
SET ended_at = COALESCE(ended_at, updated_at)
WHERE is_active = false
  AND ended_at IS NULL;

-- Close stale sessions still marked active but past their collection window
UPDATE public.attendance_sessions
SET
  is_active = false,
  ended_at = COALESCE(ended_at, NOW()),
  qr_expires_at = NOW(),
  qr_token_hash = 'closed:' || id::text
WHERE is_active = true
  AND ended_at IS NULL
  AND session_expires_at IS NOT NULL
  AND session_expires_at < NOW();

-- -----------------------------------------------------------------------------
-- 3. Constraints & defaults
-- -----------------------------------------------------------------------------
ALTER TABLE public.attendance_sessions
  ALTER COLUMN session_expires_at SET DEFAULT (NOW() + INTERVAL '15 minutes');

ALTER TABLE public.attendance_sessions
  ALTER COLUMN session_expires_at SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. Indexes for active-session lookups
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_active
  ON public.attendance_sessions (class_session_id, lecturer_id, created_at DESC)
  WHERE is_active = true AND ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_created
  ON public.attendance_sessions (class_session_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. Table grants (required for client + Realtime with RLS)
-- -----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. Supabase Realtime — live present count for lecturers during active sessions
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'attendance_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
  END IF;
END $$;

-- Ensure Realtime can broadcast row data for INSERT events (default is sufficient)
ALTER TABLE public.attendance_records REPLICA IDENTITY DEFAULT;
