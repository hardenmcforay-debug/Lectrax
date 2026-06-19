import { NextResponse } from "next/server";

import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import { exportStudentPerformanceWorkbook } from "@/lib/lecturer/export-student-performance";
import { createClient } from "@/lib/supabase/server";
import { handleApiRouteError } from "@/lib/errors/api";
import type { SemesterType, StudentTableRow } from "@/types/database";

type ExportStudentPerformanceBody = {
  rows: StudentTableRow[];
  assignmentCount: number;
  testCount: number;
};

function parseExportBody(body: unknown): ExportStudentPerformanceBody | null {
  if (!body || typeof body !== "object") return null;

  const { rows, assignmentCount, testCount } = body as ExportStudentPerformanceBody;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  if (typeof assignmentCount !== "number" || assignmentCount < 0) return null;
  if (typeof testCount !== "number" || testCount < 0) return null;

  return { rows, assignmentCount, testCount };
}

export async function POST(
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
    return NextResponse.json({ error: "Only lecturers can export student performance." }, { status: 403 });
  }

  const session = await getClassSessionForLecturer(classSessionId, user.id);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = parseExportBody(body);
  if (!payload) {
    return NextResponse.json({ error: "No students to export." }, { status: 400 });
  }

  try {
    const { buffer, fileName } = await exportStudentPerformanceWorkbook({
      rows: payload.rows,
      assignmentCount: payload.assignmentCount,
      testCount: payload.testCount,
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
