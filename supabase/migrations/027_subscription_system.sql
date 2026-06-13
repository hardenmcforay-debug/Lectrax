-- SmartRoll subscription system: free/premium tiers, grace period, payment records, expiry notifications

-- Profile subscription fields (source of truth for current lecturer access)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_plan IN ('free', 'premium')),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'grace_period', 'expired')),
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_end_date TIMESTAMPTZ;

-- Billing plan enum for premium payments
DO $$ BEGIN
  CREATE TYPE billing_plan AS ENUM ('monthly', 'semester', 'annual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Extend subscription_status enum for subscriptions table history
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'grace_period';

-- Payment record extensions
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'MONIME',
  ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
  ADD COLUMN IF NOT EXISTS billing_plan billing_plan,
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_payments_transaction_reference ON payments(transaction_reference)
  WHERE transaction_reference IS NOT NULL;

-- Expiry reminder notifications (dedupe per lecturer + end date + reminder day)
CREATE TABLE IF NOT EXISTS subscription_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_end_date TIMESTAMPTZ NOT NULL,
  days_before_expiry INT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lecturer_id, subscription_end_date, days_before_expiry)
);

CREATE INDEX IF NOT EXISTS idx_subscription_notifications_lecturer
  ON subscription_notifications(lecturer_id);

ALTER TABLE subscription_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecturer read own subscription notifications"
  ON subscription_notifications FOR SELECT
  USING (lecturer_id = auth.uid());

CREATE POLICY "Admin read all subscription notifications"
  ON subscription_notifications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- Default existing lecturers to free active plan
UPDATE profiles
SET
  subscription_plan = COALESCE(subscription_plan, 'free'),
  subscription_status = CASE
    WHEN role = 'lecturer' AND subscription_status IS NULL THEN 'active'
    ELSE subscription_status
  END
WHERE role = 'lecturer';

-- Migrate paid subscriptions into profile fields where missing
UPDATE profiles p
SET
  subscription_plan = 'premium',
  subscription_status = CASE
    WHEN s.status = 'expired' OR s.expires_at <= NOW() THEN 'expired'
    ELSE 'active'
  END,
  subscription_start_date = COALESCE(p.subscription_start_date, s.starts_at),
  subscription_end_date = COALESCE(p.subscription_end_date, s.expires_at)
FROM (
  SELECT DISTINCT ON (lecturer_id)
    lecturer_id, plan, status, starts_at, expires_at
  FROM subscriptions
  WHERE plan <> 'free'
  ORDER BY lecturer_id, expires_at DESC
) s
WHERE p.id = s.lecturer_id
  AND p.role = 'lecturer'
  AND p.subscription_plan = 'free'
  AND s.expires_at > NOW() - INTERVAL '5 days';

-- Updated helper: premium active or in grace period
CREATE OR REPLACE FUNCTION lecturer_has_writable_subscription(p_lecturer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  p RECORD;
BEGIN
  SELECT subscription_plan, subscription_status, subscription_end_date, grace_period_end_date
  INTO p
  FROM profiles
  WHERE id = p_lecturer_id AND role = 'lecturer';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF p.subscription_plan = 'free' AND p.subscription_status = 'active' THEN
    RETURN TRUE;
  END IF;

  IF p.subscription_plan = 'premium' THEN
    IF p.subscription_status = 'active' THEN
      RETURN p.subscription_end_date IS NULL OR p.subscription_end_date > NOW();
    END IF;
    IF p.subscription_status = 'grace_period' THEN
      RETURN p.grace_period_end_date IS NOT NULL AND p.grace_period_end_date > NOW();
    END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION lecturer_has_writable_subscription(UUID) TO authenticated, service_role;

-- Set default free plan for new lecturers in handle_new_user
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

  INSERT INTO public.profiles (
    id, email, full_name, role, is_active,
    subscription_plan, subscription_status
  )
  VALUES (
    NEW.id, user_email, display_name, parsed_role, true,
    CASE WHEN parsed_role = 'lecturer' THEN 'free' ELSE 'free' END,
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RETURN NEW;
END;
$$;
