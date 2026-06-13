import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";

export async function DELETE(
  _request: Request,
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
    return NextResponse.json({ error: "Only lecturers can delete activity logs." }, { status: 403 });
  }

  const session = await getClassSessionForLecturer(classSessionId, user.id);
  if (!session) {
    return NextResponse.json({ error: "Class session not found." }, { status: 404 });
  }

  const service = await createServiceClient();
  const { error: deleteError } = await service
    .from("audit_logs")
    .delete()
    .eq("class_session_id", classSessionId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message ?? "Could not delete activity logs." },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "All activity logs deleted." });
}
