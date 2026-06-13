-- Remove legacy public assignments bucket and old submissions table.
-- Migrate any remaining storage-path values from file_url, then drop file_url.

-- Backfill storage_path from file_url when it is a storage path (not an HTTP URL)
UPDATE assignment_submissions
SET storage_path = file_url
WHERE storage_path IS NULL
  AND file_url IS NOT NULL
  AND file_url NOT LIKE 'http%';

-- Remove submissions that only exist as legacy HTTP URLs (no private storage file)
DELETE FROM assignment_submissions
WHERE storage_path IS NULL;

-- file_url is redundant with storage_path in the new architecture
ALTER TABLE assignment_submissions
  DROP COLUMN IF EXISTS file_url;

ALTER TABLE assignment_submissions
  ALTER COLUMN storage_path SET NOT NULL;

-- Drop legacy submissions table (replaced by assignment_submissions + assignment_grades)
DROP TABLE IF EXISTS submissions CASCADE;

-- Revoke access to the legacy public assignments bucket (policies only — Supabase
-- blocks direct DELETE on storage.objects; remove the bucket via Dashboard or
-- supabase/scripts/remove_legacy_assignments_bucket.mjs).
DROP POLICY IF EXISTS "Authenticated upload assignments" ON storage.objects;
DROP POLICY IF EXISTS "Public read assignments" ON storage.objects;
DROP POLICY IF EXISTS "Users update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own uploads" ON storage.objects;
