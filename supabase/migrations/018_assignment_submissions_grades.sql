-- Assignment submissions + separate lecturer grades
-- Creates:
--  - assignment_submissions: student uploads + submission metadata
--  - assignment_grades: lecturer-entered grades (linked to a submission)

-- Assignment submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lecturer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, enrollment_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_enrollment ON assignment_submissions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_session ON assignment_submissions(class_session_id);

ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Lecturers can read submissions for assignments they own (for grading + PDF review)
DROP POLICY IF EXISTS "Lecturer read assignment submissions" ON assignment_submissions;
CREATE POLICY "Lecturer read assignment submissions"
ON assignment_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM assignments a
    WHERE a.id = assignment_submissions.assignment_id
      AND a.lecturer_id = auth.uid()
  )
);

-- Students can create/update their own submissions, but only when:
--  - enrollment_id belongs to them
--  - assignment_id belongs to the same class_session as their enrollment
DROP POLICY IF EXISTS "Student manage own assignment submissions" ON assignment_submissions;
CREATE POLICY "Student manage own assignment submissions"
ON assignment_submissions
FOR ALL
USING (student_id = auth.uid())
WITH CHECK (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM enrollments e
    WHERE e.id = assignment_submissions.enrollment_id
      AND e.student_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM enrollments e
    JOIN assignments a ON a.class_session_id = e.class_session_id
    WHERE a.id = assignment_submissions.assignment_id
      AND e.id = assignment_submissions.enrollment_id
      AND e.student_id = auth.uid()
  )
);

-- Updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'assignment_submissions_updated_at'
  ) THEN
    CREATE TRIGGER assignment_submissions_updated_at
    BEFORE UPDATE ON assignment_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Assignment grades
CREATE TABLE IF NOT EXISTS assignment_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_submission_id UUID NOT NULL UNIQUE REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  grade NUMERIC(5,2),
  feedback TEXT,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_grades_submission ON assignment_grades(assignment_submission_id);

ALTER TABLE assignment_grades ENABLE ROW LEVEL SECURITY;

-- Lecturers can manage grades for submissions of their assignments
DROP POLICY IF EXISTS "Lecturer manage assignment grades" ON assignment_grades;
CREATE POLICY "Lecturer manage assignment grades"
ON assignment_grades
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM assignment_submissions s
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.id = assignment_grades.assignment_submission_id
      AND a.lecturer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM assignment_submissions s
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.id = assignment_grades.assignment_submission_id
      AND a.lecturer_id = auth.uid()
  )
);

-- Students can read only their own grades
DROP POLICY IF EXISTS "Student read own assignment grades" ON assignment_grades;
CREATE POLICY "Student read own assignment grades"
ON assignment_grades
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM assignment_submissions s
    WHERE s.id = assignment_grades.assignment_submission_id
      AND s.student_id = auth.uid()
  )
);

-- Updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'assignment_grades_updated_at'
  ) THEN
    CREATE TRIGGER assignment_grades_updated_at
    BEFORE UPDATE ON assignment_grades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

