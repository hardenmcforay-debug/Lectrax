import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAssignmentDeadlineStatus } from "@/lib/assignments/deadline-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const { assignmentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select("id, deadline, class_session_id, is_published")
    .eq("id", assignmentId)
    .eq("is_published", true)
    .maybeSingle();

  if (assignmentError || !assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("class_session_id", assignment.class_session_id)
    .maybeSingle();

  if (!enrollment) {
    return NextResponse.json({ error: "You are not enrolled in this class." }, { status: 403 });
  }

  const status = await getAssignmentDeadlineStatus(
    supabase,
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
