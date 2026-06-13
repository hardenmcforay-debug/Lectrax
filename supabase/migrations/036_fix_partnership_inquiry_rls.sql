-- Fix partnership/contact inquiry admin RLS (use SECURITY DEFINER helper)

DROP POLICY IF EXISTS "Admin read partnership inquiries" ON university_partnership_inquiries;
DROP POLICY IF EXISTS "Admin update partnership inquiries" ON university_partnership_inquiries;

CREATE POLICY "Admin read partnership inquiries"
  ON university_partnership_inquiries FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Admin update partnership inquiries"
  ON university_partnership_inquiries FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Admin read contact inquiries" ON contact_inquiries;
DROP POLICY IF EXISTS "Admin update contact inquiries" ON contact_inquiries;

CREATE POLICY "Admin read contact inquiries"
  ON contact_inquiries FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Admin update contact inquiries"
  ON contact_inquiries FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Admin read platform notifications" ON platform_admin_notifications;
DROP POLICY IF EXISTS "Admin update platform notifications" ON platform_admin_notifications;

CREATE POLICY "Admin read platform notifications"
  ON platform_admin_notifications FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Admin update platform notifications"
  ON platform_admin_notifications FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

GRANT SELECT, UPDATE ON university_partnership_inquiries TO authenticated;
GRANT SELECT, UPDATE ON contact_inquiries TO authenticated;
GRANT SELECT, UPDATE ON platform_admin_notifications TO authenticated;
