-- Storage bucket for assignment files (idempotent — safe to re-run in SQL Editor)

INSERT INTO storage.buckets (id, name, public)
VALUES ('assignments', 'assignments', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Remove old policies if re-running this script
DROP POLICY IF EXISTS "Authenticated upload assignments" ON storage.objects;
DROP POLICY IF EXISTS "Public read assignments" ON storage.objects;
DROP POLICY IF EXISTS "Users update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own uploads" ON storage.objects;

-- Authenticated users can upload to assignments bucket
CREATE POLICY "Authenticated upload assignments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assignments');

-- Anyone can read (bucket is public; paths still use user folders)
CREATE POLICY "Public read assignments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assignments');

-- Users can update/delete files in their own folder: {user_id}/...
CREATE POLICY "Users update own uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'assignments'
  AND auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "Users delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assignments'
  AND auth.uid()::text = split_part(name, '/', 1)
);
