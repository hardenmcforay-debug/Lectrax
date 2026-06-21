-- Lookup auth user id by email for phone login preparation.

CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(check_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower(trim(check_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_auth_user_id_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_email(TEXT) TO service_role;

COMMENT ON FUNCTION public.get_auth_user_id_by_email IS
  'Returns auth.users.id for a given email (service role login preparation).';
