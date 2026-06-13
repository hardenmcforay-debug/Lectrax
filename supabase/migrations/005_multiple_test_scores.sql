-- Support multiple test scores per student per course per semester.
-- Adds class_tests (lecturer-defined tests) and links test_scores to each test.

-- ---------------------------------------------------------------------------
-- 1. Lecturer-defined tests for a class session (Test 1, Test 2, ...)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  lecturer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  test_number INTEGER NOT NULL CHECK (test_number > 0),
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (max_score > 0),
  semester public.semester_type NOT NULL,
  academic_year TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_session_id, semester, academic_year, test_number)
);

CREATE INDEX IF NOT EXISTS idx_class_tests_class_session
  ON public.class_tests(class_session_id);

CREATE INDEX IF NOT EXISTS idx_class_tests_lecturer
  ON public.class_tests(lecturer_id);

DROP TRIGGER IF EXISTS class_tests_updated_at ON public.class_tests;
CREATE TRIGGER class_tests_updated_at
  BEFORE UPDATE ON public.class_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Extend test_scores to reference a specific class test
-- ---------------------------------------------------------------------------
ALTER TABLE public.test_scores
  ADD COLUMN IF NOT EXISTS class_test_id UUID REFERENCES public.class_tests(id) ON DELETE CASCADE;

ALTER TABLE public.test_scores
  ADD COLUMN IF NOT EXISTS test_number INTEGER;

ALTER TABLE public.test_scores
  ADD COLUMN IF NOT EXISTS title TEXT;

-- ---------------------------------------------------------------------------
-- 3. Migrate existing single test rows -> Test 1 on class_tests
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
  COALESCE(NULLIF(TRIM(ts.notes), ''), 'Test 1'),
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
  test_number = 1,
  title = COALESCE(NULLIF(TRIM(ts.notes), ''), ct.title, 'Test 1')
FROM public.class_tests ct
WHERE ts.class_test_id IS NULL
  AND ct.class_session_id = ts.class_session_id
  AND ct.semester = ts.semester
  AND ct.academic_year = ts.academic_year
  AND ct.test_number = 1;

-- Backfill defaults for any rows still missing metadata
UPDATE public.test_scores
SET
  test_number = COALESCE(test_number, 1),
  title = COALESCE(NULLIF(TRIM(title), ''), NULLIF(TRIM(notes), ''), 'Test 1')
WHERE test_number IS NULL OR title IS NULL;

-- Enforce NOT NULL once existing rows are migrated
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.test_scores WHERE class_test_id IS NULL) THEN
    ALTER TABLE public.test_scores ALTER COLUMN class_test_id SET NOT NULL;
    ALTER TABLE public.test_scores ALTER COLUMN test_number SET NOT NULL;
    ALTER TABLE public.test_scores ALTER COLUMN title SET NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Replace old one-test-per-student constraint
-- ---------------------------------------------------------------------------
ALTER TABLE public.test_scores
  DROP CONSTRAINT IF EXISTS test_scores_class_session_id_enrollment_id_semester_academic_year_key;

ALTER TABLE public.test_scores
  DROP CONSTRAINT IF EXISTS test_scores_class_test_id_enrollment_id_key;

ALTER TABLE public.test_scores
  ADD CONSTRAINT test_scores_class_test_id_enrollment_id_key
  UNIQUE (class_test_id, enrollment_id);

CREATE INDEX IF NOT EXISTS idx_test_scores_class_test
  ON public.test_scores(class_test_id);

CREATE INDEX IF NOT EXISTS idx_test_scores_enrollment
  ON public.test_scores(enrollment_id);

-- Optional helper: next test number when lecturer adds a new test
CREATE OR REPLACE FUNCTION public.next_class_test_number(
  p_class_session_id UUID,
  p_semester public.semester_type,
  p_academic_year TEXT
)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(MAX(test_number), 0) + 1
  FROM public.class_tests
  WHERE class_session_id = p_class_session_id
    AND semester = p_semester
    AND academic_year = p_academic_year;
$$;

GRANT EXECUTE ON FUNCTION public.next_class_test_number(UUID, public.semester_type, TEXT)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. RLS for class_tests
-- ---------------------------------------------------------------------------
ALTER TABLE public.class_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecturer manage class tests" ON public.class_tests;
CREATE POLICY "Lecturer manage class tests" ON public.class_tests
  FOR ALL
  USING (lecturer_id = auth.uid())
  WITH CHECK (lecturer_id = auth.uid());

DROP POLICY IF EXISTS "Students read class tests" ON public.class_tests;
CREATE POLICY "Students read class tests" ON public.class_tests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.class_session_id = class_tests.class_session_id
        AND e.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin read class tests" ON public.class_tests;
CREATE POLICY "Admin read class tests" ON public.class_tests
  FOR SELECT
  USING (public.is_platform_admin());

COMMENT ON TABLE public.class_tests IS
  'Lecturer-defined tests (Test 1, Test 2, ...) for a class session per semester.';

COMMENT ON TABLE public.test_scores IS
  'Student score for one class test. Multiple rows allowed per enrollment via class_test_id.';

-- ---------------------------------------------------------------------------
-- Example usage (run in SQL Editor after migration)
-- ---------------------------------------------------------------------------
-- -- Lecturer creates Test 2 for a class:
-- INSERT INTO class_tests (class_session_id, lecturer_id, title, test_number, semester, academic_year)
-- SELECT
--   'YOUR-CLASS-SESSION-UUID',
--   auth.uid(),
--   'Midterm Exam',
--   public.next_class_test_number('YOUR-CLASS-SESSION-UUID', 'first_semester', '2025/2026'),
--   'first_semester',
--   '2025/2026';
--
-- -- Lecturer records a student score for that test:
-- INSERT INTO test_scores (class_session_id, enrollment_id, class_test_id, test_number, title, score, max_score, semester, academic_year)
-- SELECT
--   ct.class_session_id,
--   'ENROLLMENT-UUID',
--   ct.id,
--   ct.test_number,
--   ct.title,
--   72,
--   ct.max_score,
--   ct.semester,
--   ct.academic_year
-- FROM class_tests ct
-- WHERE ct.id = 'CLASS-TEST-UUID'
-- ON CONFLICT (class_test_id, enrollment_id)
-- DO UPDATE SET
--   score = EXCLUDED.score,
--   max_score = EXCLUDED.max_score,
--   title = EXCLUDED.title,
--   test_number = EXCLUDED.test_number,
--   updated_at = NOW();
