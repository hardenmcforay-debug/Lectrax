-- CA weight inputs should default to 0, not 10.
ALTER TABLE public.ca_configurations
  ALTER COLUMN attendance_weight SET DEFAULT 0,
  ALTER COLUMN assignment_weight SET DEFAULT 0,
  ALTER COLUMN test_weight SET DEFAULT 0;

-- Backfill legacy schema defaults that were never intentionally configured.
UPDATE public.ca_configurations
SET
  attendance_weight = 0,
  assignment_weight = 0,
  test_weight = 0
WHERE attendance_weight = 10
  AND assignment_weight = 10
  AND test_weight = 10;
