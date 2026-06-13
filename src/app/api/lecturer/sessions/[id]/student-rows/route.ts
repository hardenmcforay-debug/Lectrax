import { NextResponse } from "next/server";

import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import { getStudentTableRows } from "@/lib/session-data";
import type { CAWeights } from "@/lib/ca/constants";
import { createClient } from "@/lib/supabase/server";

function parseWeightOverride(searchParams: URLSearchParams): CAWeights | undefined {
  const attendance = searchParams.get("attendanceWeight");
  const assignment = searchParams.get("assignmentWeight");
  const test = searchParams.get("testWeight");

  if (attendance == null || assignment == null || test == null) {
    return undefined;
  }

  const parsed: CAWeights = {
    attendance: Number(attendance),
    assignment: Number(assignment),
    test: Number(test),
  };

  if (
    !Number.isFinite(parsed.attendance) ||
    !Number.isFinite(parsed.assignment) ||
    !Number.isFinite(parsed.test) ||
    parsed.attendance < 0 ||
    parsed.assignment < 0 ||
    parsed.test < 0
  ) {
    return undefined;
  }

  return parsed;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classSessionId } = await params;

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

  const classSession = await getClassSessionForLecturer(classSessionId, user.id);
  if (!classSession) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const { rows } = await getStudentTableRows(
    classSessionId,
    classSession.semester,
    classSession.academic_year,
    user.id,
    parseWeightOverride(new URL(request.url).searchParams)
  );

  return NextResponse.json({ rows });
}
