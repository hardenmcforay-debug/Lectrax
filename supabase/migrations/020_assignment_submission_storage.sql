-- Assignment submission storage: private bucket, metadata columns, deadline enforcement

-- Extend assignment_submissions with storage metadata
ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS file_size BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS submission_status TEXT NOT NULL DEFAULT 'submitted';

-- class_session_id already represents course_id (FK to class_sessions)
COMMENT ON COLUMN assignment_submissions.class_session_id IS 'course_id — references the class session (course)';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assignment_submissions_submission_status_check'
  ) THEN
    ALTER TABLE assignment_submissions
      ADD CONSTRAINT assignment_submissions_submission_status_check
      CHECK (submission_status IN ('submitted', 'locked'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_submissions_storage_path
  ON assignment_submissions(storage_path)
  WHERE storage_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status
  ON assignment_submissions(submission_status);

-- Helpers for storage policies and RLS
CREATE OR REPLACE FUNCTION public.lecturer_owns_assignment(p_assignment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  RETURN EXISTS (
    SELECT 1
    FROM public.assignments
    WHERE id = p_assignment_id
      AND lecturer_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_assignment_before_deadline(p_assignment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline timestamptz;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT deadline INTO v_deadline
  FROM public.assignments
  WHERE id = p_assignment_id;

  IF v_deadline IS NULL THEN
    RETURN false;
  END IF;

  RETURN NOW() <= v_deadline;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_owns_submission_storage_path(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT replace(split_part(p_path, '/', 5), '.pdf', '') = auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.lecturer_owns_submission_storage_path(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.lecturer_owns_assignment(
    NULLIF(split_part(p_path, '/', 4), '')::uuid
  );
$$;

ALTER FUNCTION public.lecturer_owns_assignment(uuid) OWNER TO postgres;
ALTER FUNCTION public.is_assignment_before_deadline(uuid) OWNER TO postgres;
ALTER FUNCTION public.student_owns_submission_storage_path(text) OWNER TO postgres;
ALTER FUNCTION public.lecturer_owns_submission_storage_path(text) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.lecturer_owns_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assignment_before_deadline(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_owns_submission_storage_path(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lecturer_owns_submission_storage_path(text) TO authenticated;

-- Private bucket for assignment submissions (PDF only, 10 MB max)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-submissions',
  'assignment-submissions',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for assignment-submissions bucket
DROP POLICY IF EXISTS "Student upload own submission PDF" ON storage.objects;
DROP POLICY IF EXISTS "Student read own submission PDF" ON storage.objects;
DROP POLICY IF EXISTS "Student delete own submission PDF" ON storage.objects;
DROP POLICY IF EXISTS "Lecturer read class submission PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Lecturer delete class submission PDFs" ON storage.objects;

CREATE POLICY "Student upload own submission PDF"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assignment-submissions'
  AND public.student_owns_submission_storage_path(name)
);

CREATE POLICY "Student read own submission PDF"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-submissions'
  AND public.student_owns_submission_storage_path(name)
);

CREATE POLICY "Student delete own submission PDF"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assignment-submissions'
  AND public.student_owns_submission_storage_path(name)
);

CREATE POLICY "Lecturer read class submission PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-submissions'
  AND public.lecturer_owns_submission_storage_path(name)
);

CREATE POLICY "Lecturer delete class submission PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assignment-submissions'
  AND public.lecturer_owns_submission_storage_path(name)
);

-- Tighten assignment_submissions RLS: deadline enforcement + lecturer bulk delete
DROP POLICY IF EXISTS "Student manage own assignment submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Student read own assignment submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Student insert own assignment submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Student update own assignment submissions before deadline" ON assignment_submissions;
DROP POLICY IF EXISTS "Lecturer delete assignment submissions" ON assignment_submissions;

CREATE POLICY "Student read own assignment submissions"
ON assignment_submissions
FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Student insert own assignment submissions"
ON assignment_submissions
FOR INSERT
WITH CHECK (
  student_id = auth.uid()
  AND public.is_assignment_before_deadline(assignment_id)
  AND EXISTS (
    SELECT 1
    FROM enrollments e
    WHERE e.id = assignment_submissions.enrollment_id
      AND e.student_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM enrollments e
    JOIN assignments a ON a.class_session_id = e.class_session_id
    WHERE a.id = assignment_submissions.assignment_id
      AND e.id = assignment_submissions.enrollment_id
      AND e.student_id = auth.uid()
  )
);

CREATE POLICY "Student update own assignment submissions before deadline"
ON assignment_submissions
FOR UPDATE
USING (
  student_id = auth.uid()
  AND public.is_assignment_before_deadline(assignment_id)
)
WITH CHECK (
  student_id = auth.uid()
  AND public.is_assignment_before_deadline(assignment_id)
  AND EXISTS (
    SELECT 1
    FROM enrollments e
    WHERE e.id = assignment_submissions.enrollment_id
      AND e.student_id = auth.uid()
  )
);

CREATE POLICY "Lecturer delete assignment submissions"
ON assignment_submissions
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM assignments a
    WHERE a.id = assignment_submissions.assignment_id
      AND a.lecturer_id = auth.uid()
  )
);
