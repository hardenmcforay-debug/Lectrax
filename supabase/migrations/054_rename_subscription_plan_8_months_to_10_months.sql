-- Rename annual plan enum value from 8_months to 10_months (300 days).
-- Existing subscriptions/payments rows that used 8_months are updated by the rename.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'subscription_plan'
      AND e.enumlabel = '8_months'
  ) THEN
    ALTER TYPE public.subscription_plan RENAME VALUE '8_months' TO '10_months';
  END IF;
END $$;
