-- University partnership inquiries and platform admin notifications

DO $$ BEGIN
  CREATE TYPE partnership_package AS ENUM ('small', 'medium', 'large');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE partnership_inquiry_status AS ENUM (
    'new',
    'contacted',
    'in_discussion',
    'approved',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS university_partnership_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_name TEXT NOT NULL,
  department_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  position_role TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  expected_lecturers INT NOT NULL CHECK (expected_lecturers > 0),
  selected_package partnership_package NOT NULL,
  additional_notes TEXT,
  status partnership_inquiry_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_university_partnership_inquiries_status
  ON university_partnership_inquiries(status);

CREATE INDEX IF NOT EXISTS idx_university_partnership_inquiries_created_at
  ON university_partnership_inquiries(created_at DESC);

CREATE TRIGGER university_partnership_inquiries_updated_at
  BEFORE UPDATE ON university_partnership_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE university_partnership_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read partnership inquiries"
  ON university_partnership_inquiries FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

CREATE POLICY "Admin update partnership inquiries"
  ON university_partnership_inquiries FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

CREATE TABLE IF NOT EXISTS platform_admin_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  reference_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_admin_notifications_created_at
  ON platform_admin_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_admin_notifications_unread
  ON platform_admin_notifications(is_read)
  WHERE is_read = FALSE;

ALTER TABLE platform_admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read platform notifications"
  ON platform_admin_notifications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

CREATE POLICY "Admin update platform notifications"
  ON platform_admin_notifications FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );
