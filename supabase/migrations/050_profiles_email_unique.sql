-- Unique indexed contact emails on profiles (excludes placeholder addresses).

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL
    AND email NOT LIKE '%@users.local';

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

COMMENT ON INDEX public.idx_profiles_email_unique IS
  'Ensures each real contact email maps to at most one Lectrax account.';
