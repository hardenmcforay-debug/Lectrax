import { NextResponse } from "next/server";

import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import { exportStudentPerformanceWorkbook } from "@/lib/lecturer/export-student-performance";
import { getStudentTableRows } from "@/lib/session-data";
import { createClient } from "@/lib/supabase/server";
import { handleApiRouteError } from "@/lib/errors/api";
import { parseJsonBody, parseRouteUuid } from "@/lib/security/parse-request";
import { exportStudentPerformanceSchema } from "@/lib/validations";
import type { CAWeights } from "@/lib/ca/constants";
import type { SemesterType } from "@/types/database";

export async function POST(
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
    return NextResponse.json({ error: "Only lecturers can export student performance." }, { status: 403 });
  }

  const session = await getClassSessionForLecturer(routeId.id, user.id);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const payload = exportStudentPerformanceSchema.safeParse(parsedBody.body ?? {});
  if (!payload.success) {
    return NextResponse.json(
      { error: payload.error.errors[0]?.message ?? "Invalid export request." },
      { status: 400 }
    );
  }

  const weightOverride: CAWeights | undefined =
    payload.data.attendanceWeight !== undefined
      ? {
          attendance: payload.data.attendanceWeight,
          assignment: payload.data.assignmentWeight!,
          test: payload.data.testWeight!,
        }
      : undefined;

  try {
    const { rows, testCount, classAssignments } = await getStudentTableRows(
      routeId.id,
      session.semester as SemesterType,
      session.academic_year,
      user.id,
      weightOverride
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "No students to export." }, { status: 400 });
    }

    const { buffer, fileName } = await exportStudentPerformanceWorkbook({
      rows,
      assignmentCount: classAssignments.length,
      testCount,
      meta: {
        session,
        semester: session.semester as SemesterType,
      },
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return handleApiRouteError("lecturer.export-student-performance", error);
  }
}
