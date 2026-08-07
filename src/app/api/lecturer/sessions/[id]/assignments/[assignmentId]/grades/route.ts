import { NextResponse } from "next/server";
import { userFacingZodMessage } from "@/lib/security/zod-helpers";
import { createServiceClient, createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import {
  ensureAssignmentSubmissionForGrading,
  getClassAssignmentForLecturer,
} from "@/lib/lecturer/class-assignments";
import { testScoresBulkSchema } from "@/lib/validations";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { requireWritableSubscription, subscriptionGuardResponse } from "@/lib/subscription/guards";
import {
  getClassSessionLabel,
  notifyStudentsByEnrollmentIds,
} from "@/lib/student/notifications";
import { withApiObservability } from "@/lib/observability/with-api-observability";

async function putHandler(
  request: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id: classSessionId, assignmentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "lecturer") {
    return NextResponse.json({ error: "Only lecturers can update grades" }, { status: 403 });
  }

  const writeGuard = await requireWritableSubscription(user.id);
  if (!writeGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(writeGuard);
    return NextResponse.json({ error, code }, { status });
  }

  const assignment = await getClassAssignmentForLecturer(assignmentId, user.id);
  if (!assignment || assignment.class_session_id !== classSessionId) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = testScoresBulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: userFacingZodMessage(parsed.error, "Invalid grades payload") },
      { status: 400 }
    );
  }

  const maxScore = Number(assignment.max_score);
  const scores = parsed.data.scores ?? [];
  const deleteEnrollmentIds = parsed.data.deleteEnrollmentIds ?? [];

  if (scores.length === 0 && deleteEnrollmentIds.length === 0) {
    return NextResponse.json({ error: "No grade changes to save." }, { status: 400 });
  }

  for (const entry of scores) {
    if (entry.score > maxScore) {
      return NextResponse.json(
        { error: `Grade cannot exceed maximum (${maxScore}).` },
        { status: 400 }
      );
    }
  }

  const touchedEnrollmentIds = [...new Set([...scores.map((s) => s.enrollmentId), ...deleteEnrollmentIds])];

  if (touchedEnrollmentIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("id")
      .eq("class_session_id", classSessionId)
      .in("id", touchedEnrollmentIds);

    const validIds = new Set((enrollments ?? []).map((e) => e.id));
    const invalid = touchedEnrollmentIds.find((id) => !validIds.has(id));
    if (invalid) {
      return NextResponse.json({ error: "Invalid enrollment for this class" }, { status: 400 });
    }
  }

  const { data: assignmentSubmissions } = await supabase
    .from("assignment_submissions")
    .select("id, enrollment_id")
    .eq("assignment_id", assignmentId)
    .in("enrollment_id", touchedEnrollmentIds);

  const submissionByEnrollmentId = new Map(
    (assignmentSubmissions ?? []).map((s) => [s.enrollment_id as string, s.id as string])
  );

  const missingSubmissionEnrollmentIds = touchedEnrollmentIds.filter(
    (enrollmentId) => !submissionByEnrollmentId.has(enrollmentId)
  );

  // Lecturer may lack INSERT on assignment_submissions for grade-only rows — service required.
  if (missingSubmissionEnrollmentIds.length > 0) {
    const service = await createServiceClient();
    for (const enrollmentId of missingSubmissionEnrollmentIds) {
      const submissionId = await ensureAssignmentSubmissionForGrading(
        service,
        assignment,
        enrollmentId
      );
      submissionByEnrollmentId.set(enrollmentId, submissionId);
    }
  }

  // Upsert before delete so concurrent writers cannot clear a row another request just saved.
  if (scores.length > 0) {
    const gradeRows = scores.map((entry) => ({
      assignment_submission_id: submissionByEnrollmentId.get(entry.enrollmentId),
      grade: entry.score,
      graded_at: new Date().toISOString(),
      graded_by: user.id,
    }));

    const { error: upsertError } = await supabase.from("assignment_grades").upsert(gradeRows, {
      onConflict: "assignment_submission_id",
    });

    if (upsertError) {
      return NextResponse.json(
        { error: sanitizeErrorMessage(upsertError.message ?? "Could not save grades") },
        { status: 500 }
      );
    }

    // Student notification fan-out requires service (cross-user inserts).
    const service = await createServiceClient();
    const classLabel = await getClassSessionLabel(service, classSessionId);
    void notifyStudentsByEnrollmentIds(
      service,
      scores.map((entry) => entry.enrollmentId),
      {
        classSessionId,
        type: "grade",
        referenceId: assignmentId,
        title: "Grade updated",
        message: `Your grade for "${assignment.title}" in ${classLabel} has been updated.`,
      }
    );
  }

  if (deleteEnrollmentIds.length > 0) {
    const submissionIdsToDelete = deleteEnrollmentIds
      .map((enrollmentId) => submissionByEnrollmentId.get(enrollmentId))
      .filter((id): id is string => Boolean(id));

    const { error: deleteError } = await supabase
      .from("assignment_grades")
      .delete()
      .in("assignment_submission_id", submissionIdsToDelete);

    if (deleteError) {
      return NextResponse.json(
        { error: sanitizeErrorMessage(deleteError.message ?? "Could not clear grades") },
        { status: 500 }
      );
    }
  }

  const { trackBusinessEvent, BUSINESS_EVENTS } = await import(
    "@/lib/observability/business-events"
  );
  trackBusinessEvent(
    BUSINESS_EVENTS.GRADE_PUBLISHED,
    {
      assignmentId,
      classSessionId,
      saved: scores.length,
      deleted: deleteEnrollmentIds.length,
    },
    { userId: user.id }
  );

  return NextResponse.json({
    saved: scores.length,
    deleted: deleteEnrollmentIds.length,
  });
}


export const PUT = withApiObservability("lecturer.sessions.assignments.grades.put", putHandler);
