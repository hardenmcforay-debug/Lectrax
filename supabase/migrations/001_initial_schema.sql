-- SmartRoll Database Schema
-- Run via Supabase CLI: supabase db push

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('platform_admin', 'lecturer', 'student');
CREATE TYPE semester_type AS ENUM ('first_semester', 'second_semester', 'full_year');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'free');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE subscription_plan AS ENUM ('1_month', '3_months', '6_months', '12_months', 'free');
CREATE TYPE attendance_mark_method AS ENUM ('qr_scan', 'manual', 'device_verified');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  college_id TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Class sessions (lecturer-owned)
CREATE TABLE class_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  course_code TEXT NOT NULL,
  semester semester_type NOT NULL DEFAULT 'first_semester',
  academic_year TEXT NOT NULL,
  session_code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_class_sessions_lecturer ON class_sessions(lecturer_id);
CREATE INDEX idx_class_sessions_code ON class_sessions(session_code);

-- Enrollments (students in classes)
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  manual_student_id UUID,
  college_id TEXT,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_session_id, student_id),
  CHECK (
    (student_id IS NOT NULL AND manual_student_id IS NULL AND is_manual = false) OR
    (student_id IS NULL AND manual_student_id IS NOT NULL AND is_manual = true)
  )
);

CREATE INDEX idx_enrollments_session ON enrollments(class_session_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);

-- Manual students (no account)
CREATE TABLE manual_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  college_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE enrollments
  ADD CONSTRAINT fk_enrollments_manual_student
  FOREIGN KEY (manual_student_id) REFERENCES manual_students(id) ON DELETE CASCADE;

-- Device registrations (anti-proxy)
CREATE TABLE device_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, device_fingerprint)
);

-- Attendance sessions (daily QR sessions)
CREATE TABLE attendance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  lecturer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  qr_token_hash TEXT NOT NULL,
  qr_expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  require_gps BOOLEAN NOT NULL DEFAULT false,
  gps_radius_meters INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_sessions_class ON attendance_sessions(class_session_id);

-- Attendance records
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  mark_method attendance_mark_method NOT NULL DEFAULT 'qr_scan',
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_fingerprint TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  scan_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(attendance_session_id, enrollment_id)
);

CREATE INDEX idx_attendance_records_session ON attendance_records(attendance_session_id);
CREATE INDEX idx_attendance_records_enrollment ON attendance_records(enrollment_id);

-- Assignments
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  lecturer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  instructions_url TEXT,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  deadline TIMESTAMPTZ NOT NULL,
  semester semester_type NOT NULL,
  academic_year TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Submissions
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  grade NUMERIC(5,2),
  feedback TEXT,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, enrollment_id)
);

-- Test scores (manual entry)
CREATE TABLE test_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  semester semester_type NOT NULL,
  academic_year TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_session_id, enrollment_id, semester, academic_year)
);

-- CA configurations per class
CREATE TABLE ca_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  attendance_weight NUMERIC(5,2) NOT NULL DEFAULT 10,
  assignment_weight NUMERIC(5,2) NOT NULL DEFAULT 10,
  test_weight NUMERIC(5,2) NOT NULL DEFAULT 10,
  semester semester_type NOT NULL,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_session_id, semester, academic_year)
);

-- Subscriptions (lecturers only)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_free_override BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_lecturer ON subscriptions(lecturer_id);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  plan subscription_plan NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  monime_payment_id TEXT,
  monime_reference TEXT,
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  class_session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_session ON audit_logs(class_session_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER class_sessions_updated_at BEFORE UPDATE ON class_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER enrollments_updated_at BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER manual_students_updated_at BEFORE UPDATE ON manual_students FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER device_registrations_updated_at BEFORE UPDATE ON device_registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER attendance_sessions_updated_at BEFORE UPDATE ON attendance_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER test_scores_updated_at BEFORE UPDATE ON test_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ca_configurations_updated_at BEFORE UPDATE ON ca_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER audit_logs_updated_at BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup (safe role parsing — invalid metadata won't block signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parsed_role public.user_role;
  meta_role TEXT;
  display_name TEXT;
  user_email TEXT;
BEGIN
  meta_role := NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '');

  parsed_role := CASE meta_role
    WHEN 'platform_admin' THEN 'platform_admin'::public.user_role
    WHEN 'lecturer' THEN 'lecturer'::public.user_role
    WHEN 'student' THEN 'student'::public.user_role
    ELSE 'student'::public.user_role
  END;

  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');
  IF user_email = '' THEN
    user_email := NEW.id::text || '@users.local';
  END IF;

  display_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '');
  IF display_name IS NULL THEN
    display_name := split_part(user_email, '@', 1);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (NEW.id, user_email, display_name, parsed_role, true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generate unique session code
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM class_sessions WHERE session_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_session_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_code IS NULL OR NEW.session_code = '' THEN
    NEW.session_code := generate_session_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER class_sessions_set_code
  BEFORE INSERT ON class_sessions
  FOR EACH ROW EXECUTE FUNCTION set_session_code();

-- Sync college_id from profile to enrollments
CREATE OR REPLACE FUNCTION sync_enrollment_college_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.college_id IS NOT NULL THEN
    UPDATE enrollments SET college_id = NEW.college_id, updated_at = NOW()
    WHERE student_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER profiles_college_id_sync
  AFTER UPDATE OF college_id ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_enrollment_college_id();

-- Helper: check active subscription for lecturer
CREATE OR REPLACE FUNCTION lecturer_has_active_subscription(p_lecturer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE lecturer_id = p_lecturer_id
      AND status = 'active'
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ca_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin read all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
);
CREATE POLICY "Admin update profiles" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
);
CREATE POLICY "Lecturers read enrolled students" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN class_sessions cs ON cs.id = e.class_session_id
    WHERE e.student_id = profiles.id AND cs.lecturer_id = auth.uid()
  )
);

-- Class sessions policies
CREATE POLICY "Lecturer CRUD own sessions" ON class_sessions FOR ALL USING (lecturer_id = auth.uid());
CREATE POLICY "Students read joined sessions" ON class_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE class_session_id = class_sessions.id AND student_id = auth.uid())
  OR lecturer_id = auth.uid()
);
CREATE POLICY "Students search by session code" ON class_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
);
CREATE POLICY "Admin read all sessions" ON class_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
);

-- Enrollments policies
CREATE POLICY "Lecturer manage enrollments" ON enrollments FOR ALL USING (
  EXISTS (SELECT 1 FROM class_sessions WHERE id = enrollments.class_session_id AND lecturer_id = auth.uid())
);
CREATE POLICY "Student read own enrollments" ON enrollments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Student join sessions" ON enrollments FOR INSERT WITH CHECK (student_id = auth.uid());

-- Manual students policies
CREATE POLICY "Lecturer manage manual students" ON manual_students FOR ALL USING (
  EXISTS (SELECT 1 FROM class_sessions WHERE id = manual_students.class_session_id AND lecturer_id = auth.uid())
);

-- Device registrations
CREATE POLICY "Student manage own devices" ON device_registrations FOR ALL USING (student_id = auth.uid());

-- Attendance sessions
CREATE POLICY "Lecturer manage attendance sessions" ON attendance_sessions FOR ALL USING (lecturer_id = auth.uid());
CREATE POLICY "Students read active attendance" ON attendance_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE class_session_id = attendance_sessions.class_session_id AND student_id = auth.uid())
);

-- Attendance records
CREATE POLICY "Lecturer read attendance records" ON attendance_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM class_sessions WHERE id = attendance_records.class_session_id AND lecturer_id = auth.uid())
);
CREATE POLICY "Lecturer insert manual attendance" ON attendance_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM class_sessions WHERE id = attendance_records.class_session_id AND lecturer_id = auth.uid())
);
CREATE POLICY "Student read own attendance" ON attendance_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE id = attendance_records.enrollment_id AND student_id = auth.uid())
);
CREATE POLICY "Student mark via service" ON attendance_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM enrollments WHERE id = attendance_records.enrollment_id AND student_id = auth.uid())
);

-- Assignments
CREATE POLICY "Lecturer manage assignments" ON assignments FOR ALL USING (lecturer_id = auth.uid());
CREATE POLICY "Students read class assignments" ON assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE class_session_id = assignments.class_session_id AND student_id = auth.uid())
);

-- Submissions
CREATE POLICY "Lecturer grade submissions" ON submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM assignments a WHERE a.id = submissions.assignment_id AND a.lecturer_id = auth.uid())
);
CREATE POLICY "Student manage own submissions" ON submissions FOR ALL USING (student_id = auth.uid());

-- Test scores
CREATE POLICY "Lecturer manage test scores" ON test_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM class_sessions WHERE id = test_scores.class_session_id AND lecturer_id = auth.uid())
);
CREATE POLICY "Students read own test scores" ON test_scores FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE id = test_scores.enrollment_id AND student_id = auth.uid())
);

-- CA configurations
CREATE POLICY "Lecturer manage CA config" ON ca_configurations FOR ALL USING (
  EXISTS (SELECT 1 FROM class_sessions WHERE id = ca_configurations.class_session_id AND lecturer_id = auth.uid())
);
CREATE POLICY "Students read CA config" ON ca_configurations FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE class_session_id = ca_configurations.class_session_id AND student_id = auth.uid())
);

-- Subscriptions
CREATE POLICY "Lecturer read own subscription" ON subscriptions FOR SELECT USING (lecturer_id = auth.uid());
CREATE POLICY "Admin manage subscriptions" ON subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
);

-- Payments
CREATE POLICY "Lecturer read own payments" ON payments FOR SELECT USING (lecturer_id = auth.uid());
CREATE POLICY "Lecturer insert payments" ON payments FOR INSERT WITH CHECK (lecturer_id = auth.uid());
CREATE POLICY "Admin read all payments" ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
);

-- Audit logs
CREATE POLICY "Lecturer read session audit logs" ON audit_logs FOR SELECT USING (
  class_session_id IS NULL OR EXISTS (
    SELECT 1 FROM class_sessions WHERE id = audit_logs.class_session_id AND lecturer_id = auth.uid()
  )
);
CREATE POLICY "Admin read all audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
);
CREATE POLICY "Authenticated insert audit logs" ON audit_logs FOR INSERT WITH CHECK (actor_id = auth.uid());

-- Storage buckets (run in Supabase dashboard or separate migration)
-- assignments bucket: lecturers upload, students read own class
