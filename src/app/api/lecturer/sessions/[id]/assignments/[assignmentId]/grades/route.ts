import { NextResponse } from "next/server";
import { createServiceClient, createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import {
  ensureManualAssignmentSubmission,
  getClassAssignmentForLecturer,
} from "@/lib/lecturer/class-assignments";
import { testScoresBulkSchema } from "@/lib/validations";
import { requireWritableSubscription, subscriptionGuardResponse } from "@/lib/subscription/guards";

export async function PUT(
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
      { error: parsed.error.errors[0]?.message ?? "Invalid grades payload" },
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

  const service = await createServiceClient();

  let manualEnrollmentIds = new Set<string>();

  if (touchedEnrollmentIds.length > 0) {
    const { data: enrollments } = await service
      .from("enrollments")
      .select("id, is_manual")
      .eq("class_session_id", classSessionId)
      .in("id", touchedEnrollmentIds);

    const validIds = new Set((enrollments ?? []).map((e) => e.id));
    const invalid = touchedEnrollmentIds.find((id) => !validIds.has(id));
    if (invalid) {
      return NextResponse.json({ error: "Invalid enrollment for this class" }, { status: 400 });
    }

    manualEnrollmentIds = new Set(
      (enrollments ?? []).filter((e) => e.is_manual).map((e) => e.id as string)
    );
  }

  const { data: assignmentSubmissions } = await service
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

  const missingNonManualSubmissionIds = missingSubmissionEnrollmentIds.filter(
    (enrollmentId) => !manualEnrollmentIds.has(enrollmentId)
  );

  if (missingNonManualSubmissionIds.length > 0) {
    return NextResponse.json(
      {
        error:
          "Registered students must submit a PDF before they can be graded. Manual students may be graded without a submission.",
        invalidEnrollmentIds: missingNonManualSubmissionIds,
      },
      { status: 400 }
    );
  }

  for (const enrollmentId of missingSubmissionEnrollmentIds) {
    const submissionId = await ensureManualAssignmentSubmission(service, assignment, enrollmentId);
    submissionByEnrollmentId.set(enrollmentId, submissionId);
  }

  // Deletes are batch-delete of grade rows (grade itself is one-per-submission via UNIQUE constraint).
  if (deleteEnrollmentIds.length > 0) {
    const submissionIdsToDelete = deleteEnrollmentIds
      .map((enrollmentId) => submissionByEnrollmentId.get(enrollmentId))
      .filter((id): id is string => Boolean(id));

    const { error: deleteError } = await service
      .from("assignment_grades")
      .delete()
      .in("assignment_submission_id", submissionIdsToDelete);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message ?? "Could not clear grades" },
        { status: 500 }
      );
    }
  }

  if (scores.length > 0) {
    const gradeRows = scores.map((entry) => ({
      assignment_submission_id: submissionByEnrollmentId.get(entry.enrollmentId),
      grade: entry.score,
      graded_at: new Date().toISOString(),
      graded_by: user.id,
    }));

    const { error: upsertError } = await service.from("assignment_grades").upsert(gradeRows, {
      onConflict: "assignment_submission_id",
    });

    if (upsertError) {
      return NextResponse.json(
        { error: upsertError.message ?? "Could not save grades" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    saved: scores.length,
    deleted: deleteEnrollmentIds.length,
  });
}

