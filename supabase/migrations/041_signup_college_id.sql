-- Persist student college ID from signup metadata into profiles.

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

  meta_college_id := NULLIF(TRIM(NEW.raw_user_meta_data->>'college_id'), '');

  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');
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
    true,
    'free',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    college_id = CASE
      WHEN public.profiles.role = 'student' AND EXCLUDED.college_id IS NOT NULL
        THEN EXCLUDED.college_id
      ELSE public.profiles.college_id
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Backfill college_id for student profiles created before this migration.
UPDATE public.profiles p
SET college_id = NULLIF(TRIM(u.raw_user_meta_data->>'college_id'), ''),
    updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND p.role = 'student'
  AND p.college_id IS NULL
  AND NULLIF(TRIM(u.raw_user_meta_data->>'college_id'), '') IS NOT NULL;
