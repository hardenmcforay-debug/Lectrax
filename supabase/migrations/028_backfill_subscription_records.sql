-- Backfill subscription history rows for premium lecturers missing `subscriptions` records.
-- Also ensure service role can write subscription history and notifications.

GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscription_notifications TO service_role;

INSERT INTO subscriptions (
  lecturer_id,
  plan,
  status,
  starts_at,
  expires_at,
  is_free_override,
  granted_by
)
SELECT
  p.id,
  CASE
    WHEN pay.id IS NULL THEN 'free'::subscription_plan
    WHEN pay.billing_plan::text = 'monthly' THEN '1_month'::subscription_plan
    WHEN pay.billing_plan::text = 'semester' THEN '3_months'::subscription_plan
    ELSE '12_months'::subscription_plan
  END,
  CASE p.subscription_status
    WHEN 'grace_period' THEN 'grace_period'::subscription_status
    WHEN 'expired' THEN 'expired'::subscription_status
    ELSE 'active'::subscription_status
  END,
  COALESCE(p.subscription_start_date, pay.subscription_start_date, pay.paid_at, NOW()),
  p.subscription_end_date,
  pay.id IS NULL,
  NULL
FROM profiles p
LEFT JOIN LATERAL (
  SELECT id, billing_plan, subscription_start_date, subscription_end_date, paid_at
  FROM payments
  WHERE lecturer_id = p.id
    AND status = 'completed'
  ORDER BY paid_at DESC NULLS LAST
  LIMIT 1
) pay ON TRUE
WHERE p.role = 'lecturer'
  AND p.subscription_plan = 'premium'
  AND p.subscription_end_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM subscriptions s
    WHERE s.lecturer_id = p.id
      AND s.expires_at = p.subscription_end_date
  );

-- Link completed payments to backfilled subscription rows when missing.
UPDATE payments pay
SET subscription_id = s.id
FROM subscriptions s
WHERE pay.lecturer_id = s.lecturer_id
  AND pay.status = 'completed'
  AND pay.subscription_id IS NULL
  AND s.expires_at = pay.subscription_end_date;

-- Seed activation notifications for backfilled premium lecturers (deduped by unique constraint).
INSERT INTO subscription_notifications (
  lecturer_id,
  subscription_end_date,
  days_before_expiry,
  message
)
SELECT
  p.id,
  p.subscription_end_date,
  0,
  'Your SmartRoll Premium subscription record was restored. Access continues through '
    || to_char(p.subscription_end_date AT TIME ZONE 'UTC', 'Mon DD, YYYY') || '.'
FROM profiles p
WHERE p.role = 'lecturer'
  AND p.subscription_plan = 'premium'
  AND p.subscription_end_date IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM subscriptions s WHERE s.lecturer_id = p.id
  )
ON CONFLICT (lecturer_id, subscription_end_date, days_before_expiry) DO NOTHING;
