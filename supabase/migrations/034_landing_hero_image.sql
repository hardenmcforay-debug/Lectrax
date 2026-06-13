-- Landing hero image: public bucket + site_settings metadata

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site settings" ON site_settings;
CREATE POLICY "Public read site settings"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Platform admin manage site settings" ON site_settings;
CREATE POLICY "Platform admin manage site settings"
  ON site_settings FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landing-assets',
  'landing-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read landing assets" ON storage.objects;
CREATE POLICY "Public read landing assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'landing-assets');

DROP POLICY IF EXISTS "Platform admin upload landing assets" ON storage.objects;
CREATE POLICY "Platform admin upload landing assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'landing-assets'
    AND public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Platform admin update landing assets" ON storage.objects;
CREATE POLICY "Platform admin update landing assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'landing-assets'
    AND public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Platform admin delete landing assets" ON storage.objects;
CREATE POLICY "Platform admin delete landing assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'landing-assets'
    AND public.is_platform_admin()
  );
