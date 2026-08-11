import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { removeEnrollmentFromSession } from "@/lib/lecturer/remove-enrollment";
import {
  requireWritableSubscription,
  subscriptionGuardResponse,
} from "@/lib/subscription/guards";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { parseRouteUuid } from "@/lib/security/parse-request";
import { withApiObservability } from "@/lib/observability/with-api-observability";


async function deleteHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  const { id: classSessionId, enrollmentId: rawEnrollmentId } = await params;

  const sessionIdParsed = parseRouteUuid(classSessionId, "session ID");
  if (!sessionIdParsed.ok) return sessionIdParsed.response;

  const enrollmentIdParsed = parseRouteUuid(rawEnrollmentId, "enrollment ID");
  if (!enrollmentIdParsed.ok) return enrollmentIdParsed.response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "lecturer") {
    return NextResponse.json({ error: "Only lecturers can remove students" }, { status: 403 });
  }

  const writeGuard = await requireWritableSubscription(user.id);
  if (!writeGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(writeGuard);
    return NextResponse.json({ error, code }, { status });
  }

  try {
    const result = await removeEnrollmentFromSession(
      sessionIdParsed.id,
      enrollmentIdParsed.id,
      user.id
    );

    if (!result) {
      return NextResponse.json({ error: "Student not found in this class" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      enrollmentId: result.enrollmentId,
      studentName: result.studentName,
      wasManual: result.wasManual,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: sanitizeErrorMessage(
          error instanceof Error ? error.message : "Could not remove student"
        ),
      },
      { status: 500 }
    );
  }
}

export const DELETE = withApiObservability("lecturer.sessions.enrollments.delete", deleteHandler);
