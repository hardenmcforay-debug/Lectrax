-- Run in SQL Editor to diagnose signup / "Database error creating new user"

-- 1. Does profiles table exist?
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'profiles'
) AS profiles_table_exists;

-- 2. Does the trigger exist?
SELECT tgname, tgenabled
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'auth' AND c.relname = 'users' AND tgname = 'on_auth_user_created';

-- 3. Is handle_new_user defined?
SELECT proname, prosecdef
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND proname = 'handle_new_user';

-- 4. Recent auth users without profiles (orphans)
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 5. Fix orphans (creates missing profile rows)
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT
  u.id,
  COALESCE(u.email, u.id::text || '@users.local'),
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), split_part(COALESCE(u.email, 'user'), '@', 1)),
  'student'::public.user_role,
  true
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
