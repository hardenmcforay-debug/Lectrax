import { logAudit } from "@/lib/audit";
import { SUBMISSION_CLOSED_ERROR } from "@/lib/assignments/deadline-messages";
import { isAssignmentBeforeDeadline } from "@/lib/assignments/deadline-server";
import {
  lockExpiredAssignmentSubmissions,
  uploadAssignmentSubmission,
} from "@/lib/assignments/submissions";
import { requirePremiumFeature, subscriptionGuardResponse } from "@/lib/subscription/guards";
import { requireStudentRole } from "@/lib/auth/require-api-role";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function logRejectedSubmission(params: {
  userId: string;
  assignmentId: string;
  classSessionId: string;
  deadline: string;
  reason: string;
  fileName?: string;
}) {
  void logAudit({
    action: "assignment_submission_rejected",
    entityType: "assignment",
    entityId: params.assignmentId,
    classSessionId: params.classSessionId,
    metadata: {
      reason: params.reason,
      deadline: params.deadline,
      fileName: params.fileName ?? null,
      actorId: params.userId,
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const { assignmentId } = await params;

  const auth = await requireStudentRole();
  if (auth.error) return auth.error;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
  }

  const { data: assignment, error: assignmentError } = await auth.supabase
    .from("assignments")
    .select("id, lecturer_id, class_session_id, deadline, semester, academic_year, is_published")
    .eq("id", assignmentId)
    .eq("is_published", true)
    .maybeSingle();

  if (assignmentError || !assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const premiumGuard = await requirePremiumFeature(
    assignment.lecturer_id,
    "student_submissions"
  );
  if (!premiumGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(premiumGuard);
    return NextResponse.json({ error, code }, { status });
  }

  const service = await createServiceClient();
  await lockExpiredAssignmentSubmissions(service, assignmentId);

  const beforeDeadline = await isAssignmentBeforeDeadline(
    null,
    assignmentId,
    assignment.deadline as string
  );
  if (!beforeDeadline) {
    await logRejectedSubmission({
      userId: auth.userId,
      assignmentId,
      classSessionId: assignment.class_session_id as string,
      deadline: assignment.deadline as string,
      reason: "deadline_passed",
      fileName: file.name,
    });

    return NextResponse.json({ error: SUBMISSION_CLOSED_ERROR }, { status: 403 });
  }

  const { data: enrollment, error: enrollmentError } = await auth.supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", auth.userId)
    .eq("class_session_id", assignment.class_session_id)
    .maybeSingle();

  if (enrollmentError || !enrollment) {
    return NextResponse.json({ error: "You are not enrolled in this class." }, { status: 403 });
  }

  const { data: session, error: sessionError } = await auth.supabase
    .from("class_sessions")
    .select("course_code")
    .eq("id", assignment.class_session_id)
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Class session not found." }, { status: 404 });
  }

  const { data: existing } = await auth.supabase
    .from("assignment_submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("enrollment_id", enrollment.id)
    .eq("student_id", auth.userId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You have already submitted this assignment. You cannot upload again." },
      { status: 403 }
    );
  }

  const { error, scanReason } = await uploadAssignmentSubmission({
    supabase: auth.supabase,
    userId: auth.userId,
    assignment,
    session,
    enrollmentId: enrollment.id,
    file,
    hasExistingSubmission: false,
  });

  if (error) {
    const isDeadlineRejection =
      error.includes("deadline") ||
      error.includes("Submission Closed") ||
      error.includes("no longer submit") ||
      error.includes("no longer accepted");

    if (isDeadlineRejection) {
      await logRejectedSubmission({
        userId: auth.userId,
        assignmentId,
        classSessionId: assignment.class_session_id as string,
        deadline: assignment.deadline as string,
        reason: "deadline_passed",
        fileName: file.name,
      });
    } else if (!error.includes("already submitted")) {
      await logRejectedSubmission({
        userId: auth.userId,
        assignmentId,
        classSessionId: assignment.class_session_id as string,
        deadline: assignment.deadline as string,
        reason:
          scanReason === "antivirus_rejected"
            ? "security_scan_failed"
            : scanReason?.startsWith("pdf_") || scanReason === "invalid_pdf_header"
              ? "pdf_inspection_failed"
              : "validation_failed",
        fileName: file.name,
      });
    }

    const status = isDeadlineRejection || error.includes("already submitted") ? 403 : 400;
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ success: true });
}
