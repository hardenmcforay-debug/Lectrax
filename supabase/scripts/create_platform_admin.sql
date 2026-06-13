-- =============================================================================
-- SmartRoll — Create / promote Platform Admin
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================
--
-- If "Database error creating new user" appears in Authentication:
--   1. Run FIRST: supabase/migrations/003_fix_auth_signup_trigger.sql
--   2. Then create user in Dashboard → Authentication → Users → Add user
--   3. Then run STEP 2 below (or use promote-only block at bottom)
-- =============================================================================

-- STEP 2: Promote existing user (after Auth user exists)
DO $$
DECLARE
  admin_email TEXT := 'admin@yourdomain.com';  -- ← CHANGE THIS
  admin_name  TEXT := 'Platform Admin';
  user_id     UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = admin_email;

  IF user_id IS NULL THEN
    RAISE EXCEPTION
      'No auth user for "%". Run 003_fix_auth_signup_trigger.sql, then create user in Authentication → Users (Auto Confirm), then re-run.',
      admin_email;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (user_id, admin_email, admin_name, 'platform_admin', true)
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = EXCLUDED.full_name,
    role       = 'platform_admin',
    is_active  = true,
    updated_at = NOW();

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'platform_admin', 'full_name', admin_name)
  WHERE id = user_id;

  RAISE NOTICE 'Platform admin ready: %', admin_email;
END $$;

SELECT id, email, full_name, role, is_active FROM public.profiles WHERE role = 'platform_admin';

-- -----------------------------------------------------------------------------
-- PROMOTE ONLY (user already exists in Auth + profiles)
-- -----------------------------------------------------------------------------
-- UPDATE public.profiles SET role = 'platform_admin', is_active = true WHERE email = 'you@email.com';
