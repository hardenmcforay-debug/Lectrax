import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getAttendanceSessionPresentStudents } from "@/lib/lecturer/attendance-sessions";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { withApiObservability } from "@/lib/observability/with-api-observability";
import {
  PAGINATION,
  buildOffsetPaginationMeta,
  parseOffsetPagination,
} from "@/lib/pagination";

async function getHandler(
  request: Request,
  { params }: { params: Promise<{ id: string; attendanceSessionId: string }> }
) {
  const { id: classSessionId, attendanceSessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "lecturer") {
    return NextResponse.json({ error: "Only lecturers can view attendance." }, { status: 403 });
  }

  try {
    const pagination = parseOffsetPagination(new URL(request.url).searchParams, {
      defaultSize: 100,
      maxSize: PAGINATION.MAX_PRESENT_PAGE_SIZE,
    });

    const result = await getAttendanceSessionPresentStudents(
      classSessionId,
      attendanceSessionId,
      user.id,
      pagination
    );

    if (!result) {
      return NextResponse.json({ error: "Attendance session not found." }, { status: 404 });
    }

    return NextResponse.json({
      students: result.students,
      pagination: buildOffsetPaginationMeta(
        pagination.page,
        pagination.pageSize,
        result.total
      ),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load present students.";
    return NextResponse.json({ error: sanitizeErrorMessage(message) }, { status: 500 });
  }
}

export const GET = withApiObservability("lecturer.sessions.attendance-sessions.present.get", getHandler);
