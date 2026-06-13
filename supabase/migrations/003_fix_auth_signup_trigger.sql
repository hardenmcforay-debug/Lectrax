-- Fix: "Database error creating new user"
-- Cause: handle_new_user() fails when role metadata is invalid or RLS blocks insert.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parsed_role public.user_role;
  meta_role TEXT;
  display_name TEXT;
  user_email TEXT;
BEGIN
  meta_role := NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '');

  parsed_role := CASE meta_role
    WHEN 'platform_admin' THEN 'platform_admin'::public.user_role
    WHEN 'lecturer' THEN 'lecturer'::public.user_role
    WHEN 'student' THEN 'student'::public.user_role
    ELSE 'student'::public.user_role
  END;

  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');

  IF user_email = '' THEN
    user_email := NEW.id::text || '@users.local';
  END IF;

  display_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '');
  IF display_name IS NULL THEN
    display_name := split_part(user_email, '@', 1);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (NEW.id, user_email, display_name, parsed_role, true)
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = EXCLUDED.full_name,
    role       = EXCLUDED.role,
    is_active  = true,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Ensure trigger exists (drop + recreate avoids duplicate trigger errors)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Allow the auth service to run the trigger function
GRANT USAGE ON SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL ON public.profiles TO postgres, service_role;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates public.profiles row when auth.users is inserted';
