-- Fix platform admin (and all users) reading their own role reliably

-- Avoid recursive RLS on admin policies
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'platform_admin'
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
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- Replace recursive admin policies
DROP POLICY IF EXISTS "Admin read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin update profiles" ON public.profiles;

CREATE POLICY "Admin read all profiles" ON public.profiles
  FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Admin update profiles" ON public.profiles
  FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
