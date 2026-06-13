import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { invalidSessionTokenHash } from "@/lib/attendance/qr-rotation";

const endSchema = z.object({
  attendanceSessionId: z.string().uuid(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = endSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid attendance session id" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { attendanceSessionId } = parsed.data;

  const [{ data: profile }, { data: attendanceSession }] = await Promise.all([
    service.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    service
      .from("attendance_sessions")
      .select("id, class_session_id, is_active, ended_at")
      .eq("id", attendanceSessionId)
      .eq("lecturer_id", user.id)
      .maybeSingle(),
  ]);

  if (profile?.role !== "lecturer") {
    return NextResponse.json({ error: "Only lecturers can end attendance" }, { status: 403 });
  }

  if (!attendanceSession) {
    return NextResponse.json({ error: "Attendance session not found" }, { status: 404 });
  }

  if (!attendanceSession.is_active && attendanceSession.ended_at) {
    return NextResponse.json({
      success: true,
      alreadyClosed: true,
      endedAt: attendanceSession.ended_at,
    });
  }

  const endedAt = new Date().toISOString();

  const { error: updateError } = await service
    .from("attendance_sessions")
    .update({
      is_active: false,
      ended_at: endedAt,
      qr_token_hash: invalidSessionTokenHash(attendanceSession.id),
      qr_expires_at: endedAt,
    })
    .eq("id", attendanceSession.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  void logAudit({
    action: "attendance_session_ended",
    entityType: "attendance_session",
    entityId: attendanceSession.id,
    classSessionId: attendanceSession.class_session_id,
    metadata: { ended_at: endedAt },
  });

  return NextResponse.json({
    success: true,
    endedAt,
  });
}
