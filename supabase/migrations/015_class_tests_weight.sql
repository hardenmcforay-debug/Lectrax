-- Optional per-test weight within the CA test bucket
ALTER TABLE public.class_tests
  ADD COLUMN IF NOT EXISTS weight_percent NUMERIC(5,2)
  CHECK (weight_percent IS NULL OR (weight_percent >= 0 AND weight_percent <= 100));

COMMENT ON COLUMN public.class_tests.weight_percent IS
  'Optional share of the class test_weight from ca_configurations; split evenly when null.';
