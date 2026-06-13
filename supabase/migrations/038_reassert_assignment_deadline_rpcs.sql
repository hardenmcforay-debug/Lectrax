-- Re-assert authoritative deadline RPCs as VOLATILE (NOW() must not be cached as STABLE).

CREATE OR REPLACE FUNCTION public.get_assignment_deadline_status(p_assignment_id uuid)
RETURNS jsonb
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
    RETURN jsonb_build_object(
      'server_time', NOW(),
      'deadline', NULL,
      'before_deadline', false
    );
  END IF;

  RETURN jsonb_build_object(
    'server_time', NOW(),
    'deadline', v_deadline,
    'before_deadline', NOW() <= v_deadline
  );
END;
$$;

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

ALTER FUNCTION public.get_assignment_deadline_status(uuid) OWNER TO postgres;
ALTER FUNCTION public.is_assignment_before_deadline(uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_assignment_deadline_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assignment_deadline_status(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_assignment_before_deadline(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assignment_before_deadline(uuid) TO service_role;
