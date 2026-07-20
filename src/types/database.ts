export type UserRole = "platform_admin" | "lecturer" | "student";
export type SemesterType = "first_semester" | "second_semester" | "full_year";
export type SubscriptionStatus = "active" | "expired" | "cancelled" | "free" | "grace_period";
export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded";
export type SubscriptionPlan = "1_month" | "3_months" | "6_months" | "8_months" | "free";
export type BillingPlan = "monthly" | "semester" | "annual";
export type SubscriptionTier = "free" | "premium";
export type SubscriptionLifecycleStatus = "active" | "grace_period" | "expired";
export type AttendanceMarkMethod = "qr_scan" | "manual" | "device_verified";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  college_id: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  subscription_plan: SubscriptionTier;
  subscription_status: SubscriptionLifecycleStatus;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  grace_period_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassSession {
  id: string;
  lecturer_id: string;
  title: string;
  course_code: string;
  class_name: string | null;
  semester: SemesterType;
  academic_year: string;
  session_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  class_session_id: string;
  student_id: string | null;
  manual_student_id: string | null;
  college_id: string | null;
  is_manual: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  manual_students?: ManualStudent;
}

export interface ManualStudent {
  id: string;
  class_session_id: string;
  full_name: string;
  college_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSession {
  id: string;
  class_session_id: string;
  lecturer_id: string;
  title: string | null;
  session_date: string;
  qr_token_hash: string;
  qr_expires_at: string;
  session_expires_at: string;
  ended_at: string | null;
  is_active: boolean;
  require_gps: boolean;
  gps_radius_meters: number | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  attendance_session_id: string;
  enrollment_id: string;
  class_session_id: string;
  mark_method: AttendanceMarkMethod;
  marked_at: string;
  device_fingerprint: string | null;
  latitude: number | null;
  longitude: number | null;
  scan_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  enrollments?: Enrollment;
}

export interface Assignment {
  id: string;
  class_session_id: string;
  lecturer_id: string;
  title: string;
  description: string | null;
  instructions_url: string | null;
  max_score: number;
  deadline: string;
  semester: SemesterType;
  academic_year: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export type SubmissionStatus = "submitted" | "locked";

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  enrollment_id: string;
  student_id: string | null;
  lecturer_id: string;
  /** course_id — references class_sessions */
  class_session_id: string;
  file_name: string;
  file_size: number;
  storage_path: string | null;
  submission_status: SubmissionStatus;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentGrade {
  id: string;
  assignment_submission_id: string;
  grade: number | null;
  feedback: string | null;
  graded_at: string | null;
  graded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassTest {
  id: string;
  class_session_id: string;
  lecturer_id: string;
  title: string;
  test_number: number;
  max_score: number;
  weight_percent: number | null;
  semester: SemesterType;
  academic_year: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestScore {
  id: string;
  class_session_id: string;
  enrollment_id: string;
  class_test_id: string | null;
  test_number: number | null;
  title: string | null;
  score: number;
  max_score: number;
  semester: SemesterType;
  academic_year: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CAConfiguration {
  id: string;
  class_session_id: string;
  attendance_weight: number;
  assignment_weight: number;
  test_weight: number;
  expected_class_count: number | null;
  semester: SemesterType;
  academic_year: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  lecturer_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  starts_at: string;
  expires_at: string;
  is_free_override: boolean;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  lecturer_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  plan: SubscriptionPlan;
  status: PaymentStatus;
  payment_method: string | null;
  monime_payment_id: string | null;
  monime_reference: string | null;
  payment_provider: string;
  transaction_reference: string | null;
  billing_plan: BillingPlan | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  metadata: Record<string, unknown>;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  class_session_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceRegistration {
  id: string;
  student_id: string;
  device_fingerprint: string;
  browser_fingerprint: string | null;
  device_identifier: string | null;
  device_name: string | null;
  is_verified: boolean;
  is_attendance_authority: boolean;
  archived_at: string | null;
  device_metadata: Record<string, unknown>;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceDeviceTransfer {
  id: string;
  student_id: string;
  from_device_registration_id: string | null;
  to_device_registration_id: string;
  from_fingerprint: string | null;
  to_fingerprint: string | null;
  from_device_identifier: string | null;
  to_device_identifier: string | null;
  transferred_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type PartnershipPackage = "small" | "medium" | "large";
export type PartnershipInquiryStatus =
  | "new"
  | "contacted"
  | "in_discussion"
  | "approved"
  | "closed";

export type ContactInquiryStatus = "new" | "contacted" | "resolved" | "closed";

export interface ContactInquiry {
  id: string;
  full_name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactInquiryStatus;
  created_at: string;
  updated_at: string;
}

export interface UniversityPartnershipInquiry {
  id: string;
  university_name: string;
  department_name: string;
  contact_person: string;
  position_role: string;
  email: string;
  phone_number: string;
  expected_lecturers: number;
  selected_package: PartnershipPackage;
  additional_notes: string | null;
  status: PartnershipInquiryStatus;
  created_at: string;
  updated_at: string;
}

export interface PlatformAdminNotification {
  id: string;
  type: string;
  reference_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface StudentTableRow {
  enrollmentId: string;
  studentId: string | null;
  manualStudentId: string | null;
  name: string;
  collegeId: string | null;
  attendancePercentage: number;
  totalAttendance: number;
  totalSessions: number;
  /**
   * Assignment column displays for the lecturer/student CA table.
   * - If there are 0 or 1 assignments: length = 1
   * - If there are 2+ assignments: length = 2 (Assignment 1, Assignment 2)
   */
  assignmentDisplays: string[];
  test1Display: string;
  test2Display: string;
  totalCADisplay: string;
  semester: SemesterType;
  academicYear: string;
  isManual: boolean;
}

export const BILLING_PLAN_PRICES: Record<BillingPlan, number> = {
  monthly: 5,
  semester: 20,
  annual: 35,
};

export const BILLING_PLAN_DURATION_DAYS: Record<BillingPlan, number> = {
  monthly: 30,
  semester: 120,
  annual: 240,
};

/** @deprecated Use BILLING_PLAN_PRICES */
export const PLAN_PRICES: Record<Exclude<SubscriptionPlan, "free">, number> = {
  "1_month": 5,
  "3_months": 15,
  "6_months": 30,
  "8_months": 60,
};

/** @deprecated Use BILLING_PLAN_DURATION_DAYS */
export const PLAN_DURATION_DAYS: Record<Exclude<SubscriptionPlan, "free">, number> = {
  "1_month": 30,
  "3_months": 90,
  "6_months": 180,
  "8_months": 240,
};

export const SEMESTER_LABELS: Record<SemesterType, string> = {
  first_semester: "First Semester",
  second_semester: "Second Semester",
  full_year: "Full Academic Year",
};
