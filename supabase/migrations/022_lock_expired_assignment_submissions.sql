-- Auto-lock assignment submissions when their assignment deadline has passed.

CREATE OR REPLACE FUNCTION public.lock_expired_assignment_submissions(p_assignment_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  UPDATE assignment_submissions s
  SET
    submission_status = 'locked',
    updated_at = NOW()
  FROM assignments a
  WHERE s.assignment_id = a.id
    AND s.submission_status = 'submitted'
    AND NOW() > a.deadline
    AND (p_assignment_id IS NULL OR s.assignment_id = p_assignment_id);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_submissions_on_assignment_deadline_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deadline IS DISTINCT FROM OLD.deadline AND NOW() > NEW.deadline THEN
    PERFORM public.lock_expired_assignment_submissions(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assignments_lock_submissions_on_deadline ON assignments;
CREATE TRIGGER assignments_lock_submissions_on_deadline
AFTER UPDATE OF deadline ON assignments
FOR EACH ROW
EXECUTE FUNCTION public.lock_submissions_on_assignment_deadline_change();

ALTER FUNCTION public.lock_expired_assignment_submissions(uuid) OWNER TO postgres;
ALTER FUNCTION public.lock_submissions_on_assignment_deadline_change() OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.lock_expired_assignment_submissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_expired_assignment_submissions(uuid) TO service_role;

-- Backfill: lock submissions already past their assignment deadline
SELECT public.lock_expired_assignment_submissions();

-- Schedule periodic locking when pg_cron is available (enable in Supabase Dashboard → Integrations)
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    BEGIN
      PERFORM cron.unschedule('lock-expired-assignment-submissions');
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'lock-expired-assignment-submissions',
      '* * * * *',
      'SELECT public.lock_expired_assignment_submissions()'
    );
  END IF;
END $do$;
