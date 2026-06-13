import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  const { id: classSessionId, logId } = await params;

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
  const { data: log, error: fetchError } = await service
    .from("audit_logs")
    .select("id, class_session_id")
    .eq("id", logId)
    .maybeSingle();

  if (fetchError || !log) {
    return NextResponse.json({ error: "Activity log not found." }, { status: 404 });
  }

  if (log.class_session_id !== classSessionId) {
    return NextResponse.json({ error: "Activity log does not belong to this session." }, { status: 403 });
  }

  const { error: deleteError } = await service.from("audit_logs").delete().eq("id", logId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message ?? "Could not delete activity log." },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "Activity log deleted." });
}
