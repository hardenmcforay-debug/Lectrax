import { NextResponse } from "next/server";
import { getAssignmentDeadlineStatus } from "@/lib/assignments/deadline-server";
import { requireStudentRole } from "@/lib/auth/require-api-role";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const { assignmentId } = await params;

  const auth = await requireStudentRole();
  if (auth.error) return auth.error;

  const { data: assignment, error: assignmentError } = await auth.supabase
    .from("assignments")
    .select("id, deadline, class_session_id, is_published")
    .eq("id", assignmentId)
    .eq("is_published", true)
    .maybeSingle();

  if (assignmentError || !assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const { data: enrollment } = await auth.supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", auth.userId)
    .eq("class_session_id", assignment.class_session_id)
    .maybeSingle();

  if (!enrollment) {
    return NextResponse.json({ error: "You are not enrolled in this class." }, { status: 403 });
  }

  const status = await getAssignmentDeadlineStatus(
    auth.supabase,
    assignmentId,
    assignment.deadline as string
  );

  if (!status) {
    return NextResponse.json({ error: "Could not verify deadline status." }, { status: 503 });
  }

  return NextResponse.json({
    serverTime: status.serverTime,
    deadline: status.deadline,
    beforeDeadline: status.beforeDeadline,
    pastDeadline: !status.beforeDeadline,
  });
}
