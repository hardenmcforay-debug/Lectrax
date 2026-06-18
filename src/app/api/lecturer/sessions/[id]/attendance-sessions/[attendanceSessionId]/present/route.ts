import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getAttendanceSessionPresentStudents } from "@/lib/lecturer/attendance-sessions";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

export async function GET(
  _request: Request,
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
    const students = await getAttendanceSessionPresentStudents(
      classSessionId,
      attendanceSessionId,
      user.id
    );

    if (!students) {
      return NextResponse.json({ error: "Attendance session not found." }, { status: 404 });
    }

    return NextResponse.json({ students });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load present students.";
    return NextResponse.json({ error: sanitizeErrorMessage(message) }, { status: 500 });
  }
}
