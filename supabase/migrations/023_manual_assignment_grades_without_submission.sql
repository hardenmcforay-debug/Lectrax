-- Allow lecturer-entered assignment grades for manual students without a PDF submission.

ALTER TABLE assignment_submissions
  ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE assignment_submissions
  ALTER COLUMN storage_path DROP NOT NULL;

COMMENT ON COLUMN assignment_submissions.student_id IS
  'Null for manual-student grade records created by the lecturer without a portal account.';
COMMENT ON COLUMN assignment_submissions.storage_path IS
  'Null when the lecturer graded a manual student without an uploaded PDF.';
