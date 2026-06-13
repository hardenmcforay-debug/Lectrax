-- Run this in the Supabase SQL Editor if students can still submit after the due date.
-- Safe to re-run: drops the legacy permissive policy and reapplies deadline enforcement.

CREATE OR REPLACE FUNCTION public.is_assignment_before_deadline(p_assignment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
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

CREATE OR REPLACE FUNCTION public.assignment_id_from_submission_storage_path(p_path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(p_path, '/', 4), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.enforce_assignment_submission_before_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_assignment_before_deadline(NEW.assignment_id) THEN
    RAISE EXCEPTION 'The submission deadline has passed. You can no longer submit.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.is_assignment_before_deadline(uuid) OWNER TO postgres;
ALTER FUNCTION public.assignment_id_from_submission_storage_path(text) OWNER TO postgres;
ALTER FUNCTION public.enforce_assignment_submission_before_deadline() OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.is_assignment_before_deadline(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assignment_before_deadline(uuid) TO service_role;

DROP POLICY IF EXISTS "Student manage own assignment submissions" ON assignment_submissions;

DROP POLICY IF EXISTS "Student read own assignment submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Student insert own assignment submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Student update own assignment submissions before deadline" ON assignment_submissions;

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

DROP TRIGGER IF EXISTS assignment_submissions_enforce_deadline ON assignment_submissions;
CREATE TRIGGER assignment_submissions_enforce_deadline
BEFORE INSERT OR UPDATE ON assignment_submissions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_assignment_submission_before_deadline();

DROP POLICY IF EXISTS "Student upload own submission PDF" ON storage.objects;

CREATE POLICY "Student upload own submission PDF"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assignment-submissions'
  AND public.student_owns_submission_storage_path(name)
  AND public.is_assignment_before_deadline(
    public.assignment_id_from_submission_storage_path(name)
  )
);
