-- Allow lecturer grade-only submission rows without a PDF, even after the deadline.

CREATE OR REPLACE FUNCTION public.enforce_assignment_submission_before_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lecturer-entered grade records without a student PDF bypass deadline checks.
  IF NEW.storage_path IS NULL AND COALESCE(NEW.file_size, 0) = 0 THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_assignment_before_deadline(NEW.assignment_id) THEN
    RAISE EXCEPTION 'The submission deadline has passed. You can no longer submit.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;
