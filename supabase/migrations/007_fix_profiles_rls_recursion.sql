-- Fix: infinite recursion detected in policy for relation "profiles"
-- Cause: is_platform_admin() / get_my_role() query profiles while RLS is active.
-- Fix: bypass RLS inside SECURITY DEFINER helpers only.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'platform_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- Ensure admin profile policies use the safe helper (idempotent)
DROP POLICY IF EXISTS "Admin read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin update profiles" ON public.profiles;

CREATE POLICY "Admin read all profiles" ON public.profiles
  FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Admin update profiles" ON public.profiles
  FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
