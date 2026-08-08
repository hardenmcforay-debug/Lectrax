import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getClassAssignmentForLecturer } from "@/lib/lecturer/class-assignments";
import { deleteSubmissionFile } from "@/lib/assignments/submissions";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

export async function DELETE(
  _request: Request,
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
    return NextResponse.json({ error: "Only lecturers can delete submissions." }, { status: 403 });
  }

  const assignment = await getClassAssignmentForLecturer(assignmentId, user.id);
  if (!assignment || assignment.class_session_id !== classSessionId) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const service = await createServiceClient();

  const { data: submissions, error: submissionsError } = await service
    .from("assignment_submissions")
    .select("id, storage_path, enrollment_id")
    .eq("assignment_id", assignmentId);

  if (submissionsError) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(submissionsError.message ?? "Could not load submissions.") },
      { status: 500 }
    );
  }

  if (!submissions?.length) {
    return NextResponse.json({ error: "No submissions to delete." }, { status: 400 });
  }

  const submissionIds = submissions.map((s) => s.id);

  const { data: grades } = await service
    .from("assignment_grades")
    .select("assignment_submission_id, grade")
    .in("assignment_submission_id", submissionIds);

  const gradedSubmissionIds = new Set(
    (grades ?? []).filter((g) => g.grade !== null).map((g) => g.assignment_submission_id)
  );

  const ungraded = submissions.filter((s) => !gradedSubmissionIds.has(s.id));
  if (ungraded.length > 0) {
    return NextResponse.json(
      {
        error:
          "All submissions must be graded before you can delete them. Finish grading first.",
        ungradedCount: ungraded.length,
      },
      { status: 400 }
    );
  }

  for (const submission of submissions) {
    if (submission.storage_path) {
      await deleteSubmissionFile(service, submission.storage_path);
    }
  }

  const { error: deleteError } = await service
    .from("assignment_submissions")
    .delete()
    .eq("assignment_id", assignmentId);

  if (deleteError) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(deleteError.message ?? "Could not delete submissions.") },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: submissions.length });
}
