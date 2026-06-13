-- Fix: Test 2 grade entry fails with duplicate key on
-- (class_session_id, enrollment_id, semester, academic_year).
-- Migration 005 may not have dropped the legacy constraint on some databases.

-- ---------------------------------------------------------------------------
-- 1. Ensure multi-test columns exist
-- ---------------------------------------------------------------------------
ALTER TABLE public.test_scores
  ADD COLUMN IF NOT EXISTS class_test_id UUID REFERENCES public.class_tests(id) ON DELETE CASCADE;

ALTER TABLE public.test_scores
  ADD COLUMN IF NOT EXISTS test_number INTEGER;

ALTER TABLE public.test_scores
  ADD COLUMN IF NOT EXISTS title TEXT;

-- ---------------------------------------------------------------------------
-- 2. Drop legacy UNIQUE (one test per student per class session)
-- ---------------------------------------------------------------------------
ALTER TABLE public.test_scores
  DROP CONSTRAINT IF EXISTS test_scores_class_session_id_enrollment_id_semester_academic_year_key;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'test_scores'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) LIKE '%class_session_id%'
      AND pg_get_constraintdef(c.oid) LIKE '%enrollment_id%'
      AND pg_get_constraintdef(c.oid) NOT LIKE '%class_test_id%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.test_scores DROP CONSTRAINT IF EXISTS %I',
      constraint_name
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Backfill class_test_id on legacy rows
-- ---------------------------------------------------------------------------
INSERT INTO public.class_tests (
  class_session_id,
  lecturer_id,
  title,
  test_number,
  max_score,
  semester,
  academic_year
)
SELECT DISTINCT
  ts.class_session_id,
  cs.lecturer_id,
  COALESCE(NULLIF(TRIM(ts.title), ''), 'Test 1'),
  1,
  ts.max_score,
  ts.semester,
  ts.academic_year
FROM public.test_scores ts
JOIN public.class_sessions cs ON cs.id = ts.class_session_id
WHERE ts.class_test_id IS NULL
ON CONFLICT (class_session_id, semester, academic_year, test_number) DO NOTHING;

UPDATE public.test_scores ts
SET
  class_test_id = ct.id,
  test_number = COALESCE(ts.test_number, 1),
  title = COALESCE(NULLIF(TRIM(ts.title), ''), ct.title, 'Test 1')
FROM public.class_tests ct
WHERE ts.class_test_id IS NULL
  AND ct.class_session_id = ts.class_session_id
  AND ct.semester = ts.semester
  AND ct.academic_year = ts.academic_year
  AND ct.test_number = 1;

-- ---------------------------------------------------------------------------
-- 4. Enforce per-test uniqueness (Test 1 + Test 2 per student)
-- ---------------------------------------------------------------------------
ALTER TABLE public.test_scores
  DROP CONSTRAINT IF EXISTS test_scores_class_test_id_enrollment_id_key;

ALTER TABLE public.test_scores
  ADD CONSTRAINT test_scores_class_test_id_enrollment_id_key
  UNIQUE (class_test_id, enrollment_id);

CREATE INDEX IF NOT EXISTS idx_test_scores_class_test
  ON public.test_scores(class_test_id);

CREATE INDEX IF NOT EXISTS idx_test_scores_enrollment
  ON public.test_scores(enrollment_id);

COMMENT ON CONSTRAINT test_scores_class_test_id_enrollment_id_key ON public.test_scores IS
  'One score row per student per class test (supports Test 1 and Test 2).';
