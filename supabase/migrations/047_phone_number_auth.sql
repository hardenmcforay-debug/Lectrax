-- Phone number authentication: unique indexed phone on profiles, persist at signup.

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_phone
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parsed_role public.user_role;
  meta_role TEXT;
  meta_college_id TEXT;
  meta_phone TEXT;
  meta_contact_email TEXT;
  display_name TEXT;
  user_email TEXT;
BEGIN
  meta_role := NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '');

  -- Only lecturer and student may be assigned at signup. platform_admin is provisioned manually.
  parsed_role := CASE meta_role
    WHEN 'lecturer' THEN 'lecturer'::public.user_role
    WHEN 'student' THEN 'student'::public.user_role
    ELSE 'student'::public.user_role
  END;

  meta_college_id := NULLIF(TRIM(NEW.raw_user_meta_data->>'college_id'), '');
  meta_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');
  meta_contact_email := NULLIF(LOWER(TRIM(NEW.raw_user_meta_data->>'contact_email')), '');

  user_email := COALESCE(meta_contact_email, NEW.email, NEW.raw_user_meta_data->>'email', '');
  IF user_email = '' THEN
    user_email := NEW.id::text || '@users.local';
  END IF;

  display_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '');
  IF display_name IS NULL THEN
    display_name := split_part(user_email, '@', 1);
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    college_id,
    phone,
    is_active,
    subscription_plan,
    subscription_status
  )
  VALUES (
    NEW.id,
    user_email,
    display_name,
    parsed_role,
    CASE WHEN parsed_role = 'student' THEN meta_college_id ELSE NULL END,
    meta_phone,
    true,
    'free',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    college_id = CASE
      WHEN public.profiles.role = 'student' AND EXCLUDED.college_id IS NOT NULL
        THEN EXCLUDED.college_id
      ELSE public.profiles.college_id
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

COMMENT ON INDEX public.idx_profiles_phone_unique IS
  'Ensures each registered phone number maps to at most one Lectrax account.';
