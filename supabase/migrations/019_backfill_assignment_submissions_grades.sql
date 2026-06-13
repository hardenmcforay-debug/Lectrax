-- Backfill new assignment_submissions + assignment_grades from legacy submissions table.
-- Safe to re-run: uses ON CONFLICT DO NOTHING.

INSERT INTO assignment_submissions (
  assignment_id,
  enrollment_id,
  student_id,
  lecturer_id,
  class_session_id,
  file_url,
  file_name,
  submitted_at,
  created_at,
  updated_at
)
SELECT
  s.assignment_id,
  s.enrollment_id,
  s.student_id,
  a.lecturer_id,
  a.class_session_id,
  s.file_url,
  COALESCE(NULLIF(TRIM(s.file_name), ''), 'submission.pdf'),
  s.submitted_at,
  s.created_at,
  s.updated_at
FROM submissions s
JOIN assignments a ON a.id = s.assignment_id
WHERE s.student_id IS NOT NULL
ON CONFLICT (assignment_id, enrollment_id) DO NOTHING;

INSERT INTO assignment_grades (
  assignment_submission_id,
  grade,
  feedback,
  graded_at,
  graded_by,
  created_at,
  updated_at
)
SELECT
  ns.id,
  s.grade,
  s.feedback,
  s.graded_at,
  s.graded_by,
  s.created_at,
  s.updated_at
FROM submissions s
JOIN assignment_submissions ns
  ON ns.assignment_id = s.assignment_id
 AND ns.enrollment_id = s.enrollment_id
WHERE s.grade IS NOT NULL
ON CONFLICT (assignment_submission_id) DO NOTHING;
