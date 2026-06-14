-- Student in-app / PWA notifications for class activity

DO $$ BEGIN
  CREATE TYPE student_notification_type AS ENUM ('assignment', 'grade', 'attendance');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS student_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  type student_notification_type NOT NULL,
  reference_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_notifications_student_created
  ON student_notifications(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_notifications_student_unread
  ON student_notifications(student_id, type)
  WHERE is_read = FALSE;

ALTER TABLE student_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own notifications"
  ON student_notifications FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students mark own notifications read"
  ON student_notifications FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

GRANT SELECT, UPDATE ON student_notifications TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'student_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_notifications;
  END IF;
END $$;
