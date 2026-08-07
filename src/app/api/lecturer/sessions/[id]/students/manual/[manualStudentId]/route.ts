import { NextResponse } from "next/server";
import { userFacingZodMessage } from "@/lib/security/zod-helpers";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import { manualStudentSchema } from "@/lib/validations";
import {
  requireWritableSubscription,
  subscriptionGuardResponse,
} from "@/lib/subscription/guards";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { parseJsonBody, parseRouteUuid } from "@/lib/security/parse-request";
import { withApiObservability } from "@/lib/observability/with-api-observability";

const updateManualStudentCollegeIdSchema = manualStudentSchema.pick({
  collegeId: true,
});

async function patchHandler(
  request: Request,
  { params }: { params: Promise<{ id: string; manualStudentId: string }> }
) {
  const { id: classSessionId, manualStudentId: rawManualStudentId } = await params;

  const sessionIdParsed = parseRouteUuid(classSessionId, "session ID");
  if (!sessionIdParsed.ok) return sessionIdParsed.response;

  const manualIdParsed = parseRouteUuid(rawManualStudentId, "manual student ID");
  if (!manualIdParsed.ok) return manualIdParsed.response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "lecturer") {
    return NextResponse.json({ error: "Only lecturers can update students" }, { status: 403 });
  }

  const writeGuard = await requireWritableSubscription(user.id);
  if (!writeGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(writeGuard);
    return NextResponse.json({ error, code }, { status });
  }

  const session = await getClassSessionForLecturer(sessionIdParsed.id, user.id);
  if (!session) {
    return NextResponse.json({ error: "Class session not found" }, { status: 404 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = updateManualStudentCollegeIdSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: userFacingZodMessage(parsed.error, "Invalid college ID") },
      { status: 400 }
    );
  }

  const collegeId = parsed.data.collegeId?.trim() || null;

  const { data: existing, error: existingError } = await supabase
    .from("manual_students")
    .select("id, full_name, college_id, class_session_id")
    .eq("id", manualIdParsed.id)
    .eq("class_session_id", sessionIdParsed.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(existingError.message) },
      { status: 500 }
    );
  }

  if (!existing) {
    return NextResponse.json({ error: "Manual student not found" }, { status: 404 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("manual_students")
    .update({ college_id: collegeId })
    .eq("id", manualIdParsed.id)
    .eq("class_session_id", sessionIdParsed.id)
    .select("id, full_name, college_id")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      {
        error: sanitizeErrorMessage(
          updateError?.message ?? "Could not update college ID"
        ),
      },
      { status: 500 }
    );
  }

  // Keep enrollment snapshots in sync so attendance/grades tables update immediately.
  const { error: enrollError } = await supabase
    .from("enrollments")
    .update({ college_id: collegeId })
    .eq("manual_student_id", manualIdParsed.id)
    .eq("class_session_id", sessionIdParsed.id);

  if (enrollError) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(enrollError.message) },
      { status: 500 }
    );
  }

  return NextResponse.json({
    student: {
      id: updated.id,
      fullName: updated.full_name,
      collegeId: updated.college_id,
    },
  });
}

export const PATCH = withApiObservability("lecturer.sessions.students.manual.patch", patchHandler);
