-- Account self-deletion: preserve institutional academic history when a student
-- profile is removed, while still allowing auth.users → profiles CASCADE cleanup.

-- Snapshot column so lecturers can still identify former students in grade/attendance tables.
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS former_student_label TEXT;

COMMENT ON COLUMN enrollments.former_student_label IS
  'Anonymized display label retained after a student deletes their account.';

-- Allow student_id to become NULL when the profile/auth user is deleted.
ALTER TABLE enrollments
  DROP CONSTRAINT IF EXISTS enrollments_student_id_fkey;

ALTER TABLE enrollments
  ADD CONSTRAINT enrollments_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE assignment_submissions
  ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE assignment_submissions
  DROP CONSTRAINT IF EXISTS assignment_submissions_student_id_fkey;

ALTER TABLE assignment_submissions
  ADD CONSTRAINT assignment_submissions_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Optional soft-delete marker (set briefly before auth deletion for audit trails).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.deleted_at IS
  'Set when the user requests account deletion; profile row is removed shortly after via auth.users CASCADE.';
