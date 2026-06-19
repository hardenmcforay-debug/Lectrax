import { NextResponse } from "next/server";

import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import { getStudentTableRows } from "@/lib/session-data";
import type { CAWeights } from "@/lib/ca/constants";
import { createClient } from "@/lib/supabase/server";
import { handleApiRouteError } from "@/lib/errors/api";
import { parseRouteUuid } from "@/lib/security/parse-request";
import { studentRowsWeightQuerySchema } from "@/lib/validations";

function parseWeightOverride(searchParams: URLSearchParams): CAWeights | undefined {
  const attendance = searchParams.get("attendanceWeight");
  const assignment = searchParams.get("assignmentWeight");
  const test = searchParams.get("testWeight");

  if (attendance == null || assignment == null || test == null) {
    return undefined;
  }

  const parsed = studentRowsWeightQuerySchema.safeParse({
    attendanceWeight: attendance,
    assignmentWeight: assignment,
    testWeight: test,
  });

  if (!parsed.success) {
    return undefined;
  }

  return {
    attendance: parsed.data.attendanceWeight,
    assignment: parsed.data.assignmentWeight,
    test: parsed.data.testWeight,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classSessionId } = await params;
  const routeId = parseRouteUuid(classSessionId, "session ID");
  if (!routeId.ok) return routeId.response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "lecturer") {
    return NextResponse.json({ error: "Only lecturers can view student rows." }, { status: 403 });
  }

  const classSession = await getClassSessionForLecturer(routeId.id, user.id);
  if (!classSession) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  try {
    const { rows } = await getStudentTableRows(
      routeId.id,
      classSession.semester,
      classSession.academic_year,
      user.id,
      parseWeightOverride(new URL(request.url).searchParams)
    );

    return NextResponse.json({ rows });
  } catch (error) {
    return handleApiRouteError("lecturer.student-rows", error);
  }
}
