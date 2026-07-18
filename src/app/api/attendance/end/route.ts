import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { persistAttendanceSessionClosed } from "@/lib/attendance/close-session";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

const endSchema = z.object({
  attendanceSessionId: z.string().uuid(),
});

async function parseEndBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }

  // sendBeacon may omit content-type or send text/plain
  try {
    const text = await request.text();
    if (!text) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await parseEndBody(request);
  if (body == null) {
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

  try {
    const endedAt = await persistAttendanceSessionClosed(service, attendanceSession);

    void logAudit({
      action: "attendance_session_ended",
      entityType: "attendance_session",
      entityId: attendanceSession.id,
      classSessionId: attendanceSession.class_session_id,
      metadata: { ended_at: endedAt, reason: "lecturer_end" },
    });

    return NextResponse.json({
      success: true,
      endedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not end attendance session";
    return NextResponse.json({ error: sanitizeErrorMessage(message) }, { status: 500 });
  }
}
