-- Fix student profile updates not persisting (RLS + table grants)

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
