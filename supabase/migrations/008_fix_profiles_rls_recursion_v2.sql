-- Definitive fix: infinite recursion on public.profiles RLS policies
-- Root cause: policies that query profiles inside profiles RLS checks.
-- Strategy: reset all profiles policies + safe SECURITY DEFINER helpers.

-- ---------------------------------------------------------------------------
-- 1. Safe helpers (bypass RLS inside function body)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'platform_admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.user_role;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT role INTO result
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  RETURN result;
END;
$$;

ALTER FUNCTION public.is_platform_admin() OWNER TO postgres;
ALTER FUNCTION public.get_my_role() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Drop every existing policy on profiles (removes legacy recursive ones)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Recreate minimal non-recursive policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin read all profiles" ON public.profiles
  FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Admin update profiles" ON public.profiles
  FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Lecturers read enrolled students" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.class_sessions cs ON cs.id = e.class_session_id
      WHERE e.student_id = profiles.id
        AND cs.lecturer_id = auth.uid()
    )
  );

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
