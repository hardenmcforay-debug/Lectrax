import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getClassTestForLecturer } from "@/lib/lecturer/class-tests";
import { testScoresBulkSchema } from "@/lib/validations";
import { requireWritableSubscription, subscriptionGuardResponse } from "@/lib/subscription/guards";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import {
  getClassSessionLabel,
  notifyStudentsByEnrollmentIds,
} from "@/lib/student/notifications";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; testId: string }> }
) {
  const { id: classSessionId, testId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "lecturer") {
    return NextResponse.json({ error: "Only lecturers can update scores" }, { status: 403 });
  }

  const writeGuard = await requireWritableSubscription(user.id);
  if (!writeGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(writeGuard);
    return NextResponse.json({ error, code }, { status });
  }

  const test = await getClassTestForLecturer(testId, user.id);
  if (!test || test.class_session_id !== classSessionId) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
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
      { error: parsed.error.errors[0]?.message ?? "Invalid scores" },
      { status: 400 }
    );
  }

  const maxScore = Number(test.max_score);
  const scores = parsed.data.scores ?? [];
  const deleteEnrollmentIds = parsed.data.deleteEnrollmentIds ?? [];

  if (scores.length === 0 && deleteEnrollmentIds.length === 0) {
    return NextResponse.json({ error: "No grade changes to save." }, { status: 400 });
  }

  for (const entry of scores) {
    if (entry.score > maxScore) {
      return NextResponse.json(
        { error: `Score cannot exceed maximum (${maxScore}).` },
        { status: 400 }
      );
    }
  }

  const service = await createServiceClient();
  const touchedIds = [
    ...scores.map((s) => s.enrollmentId),
    ...deleteEnrollmentIds,
  ];

  if (touchedIds.length > 0) {
    const { data: enrollments } = await service
      .from("enrollments")
      .select("id")
      .eq("class_session_id", classSessionId)
      .in("id", touchedIds);

    const validIds = new Set((enrollments ?? []).map((e) => e.id));
    const invalid = touchedIds.find((id) => !validIds.has(id));
    if (invalid) {
      return NextResponse.json({ error: "Invalid enrollment for this class" }, { status: 400 });
    }
  }

  if (deleteEnrollmentIds.length > 0) {
    const { error: deleteError } = await service
      .from("test_scores")
      .delete()
      .eq("class_test_id", testId)
      .in("enrollment_id", deleteEnrollmentIds);

    if (deleteError) {
      return NextResponse.json(
        { error: sanitizeErrorMessage(deleteError.message ?? "Could not clear scores") },
        { status: 500 }
      );
    }
  }

  if (scores.length > 0) {
    const rows = scores.map((entry) => ({
      class_session_id: classSessionId,
      enrollment_id: entry.enrollmentId,
      class_test_id: testId,
      test_number: test.test_number,
      title: test.title,
      score: entry.score,
      max_score: maxScore,
      semester: test.semester,
      academic_year: test.academic_year,
    }));

    const { error } = await service.from("test_scores").upsert(rows, {
      onConflict: "class_test_id,enrollment_id",
      ignoreDuplicates: false,
    });

    if (error) {
      const message = sanitizeErrorMessage(error.message ?? "Could not save scores");
      const legacyUnique =
        message.includes("class_session_id_enrollment_id") ||
        message.includes("semester_academi");

      return NextResponse.json(
        {
          error: legacyUnique
            ? "Database still uses the old one-test-per-student rule. Run migration 016_fix_test_scores_unique_for_test2.sql in Supabase, then try again."
            : message,
        },
        { status: 500 }
      );
    }

    const classLabel = await getClassSessionLabel(service, classSessionId);
    void notifyStudentsByEnrollmentIds(
      service,
      scores.map((entry) => entry.enrollmentId),
      {
        classSessionId,
        type: "grade",
        referenceId: testId,
        title: "Grade updated",
        message: `Your score for "${test.title}" in ${classLabel} has been updated.`,
      }
    );
  }

  return NextResponse.json({
    saved: scores.length,
    deleted: deleteEnrollmentIds.length,
  });
}
