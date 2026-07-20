-- Rename legacy annual plan enum value from 12_months to 8_months (240 days).
-- Existing subscriptions/payments rows that used 12_months are updated by the rename.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'subscription_plan'
      AND e.enumlabel = '12_months'
  ) THEN
    ALTER TYPE public.subscription_plan RENAME VALUE '12_months' TO '8_months';
  END IF;
END $$;
