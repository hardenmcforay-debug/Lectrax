import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getClassTestForLecturer, deleteClassTest } from "@/lib/lecturer/class-tests";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; testId: string }> }
) {
  const { id: classSessionId, testId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "lecturer") {
    return NextResponse.json({ error: "Only lecturers can delete tests" }, { status: 403 });
  }

  const test = await getClassTestForLecturer(testId, user.id);
  if (!test || test.class_session_id !== classSessionId) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  try {
    const result = await deleteClassTest(testId, user.id);
    if (!result) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Test deleted successfully.",
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete test.";
    return NextResponse.json({ error: sanitizeErrorMessage(message) }, { status: 500 });
  }
}
