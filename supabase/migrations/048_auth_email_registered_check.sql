-- Fast auth email lookup for signup duplicate checks (service role / SECURITY DEFINER).

CREATE OR REPLACE FUNCTION public.is_auth_email_registered(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = lower(trim(check_email))
  );
$$;

REVOKE ALL ON FUNCTION public.is_auth_email_registered(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_auth_email_registered(TEXT) TO service_role;

COMMENT ON FUNCTION public.is_auth_email_registered IS
  'Returns true when an auth.users row exists for the given email (used before signup).';
