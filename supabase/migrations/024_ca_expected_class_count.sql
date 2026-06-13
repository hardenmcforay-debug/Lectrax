-- Expected total classes students should attend (denominator for attendance CA).

ALTER TABLE ca_configurations
  ADD COLUMN IF NOT EXISTS expected_class_count INTEGER;

COMMENT ON COLUMN ca_configurations.expected_class_count IS
  'Total classes students are expected to attend for the semester; used as the attendance denominator in CA.';
