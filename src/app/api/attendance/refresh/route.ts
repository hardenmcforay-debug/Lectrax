import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { isAttendanceSessionOpen } from "@/lib/attendance/constants";
import { buildRotatedQRToken, buildScanUrl, invalidSessionTokenHash } from "@/lib/attendance/qr-rotation";
import {
  getAttendanceSessionForLecturer,
} from "@/lib/attendance/sessions";

const refreshSchema = z.object({
  attendanceSessionId: z.string().uuid(),
});

function resolveAppUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "lecturer") {
    return NextResponse.json({ error: "Only lecturers can refresh QR codes" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid attendance session id" }, { status: 400 });
  }

  const attendanceSession = await getAttendanceSessionForLecturer(
    parsed.data.attendanceSessionId,
    user.id
  );

  if (!attendanceSession) {
    return NextResponse.json({ error: "Attendance session not found" }, { status: 404 });
  }

  if (!isAttendanceSessionOpen(attendanceSession)) {
    const service = await createServiceClient();
    if (
      !attendanceSession.ended_at &&
      new Date(attendanceSession.session_expires_at) <= new Date()
    ) {
      await service
        .from("attendance_sessions")
        .update({
          is_active: false,
          ended_at: attendanceSession.session_expires_at,
          qr_token_hash: invalidSessionTokenHash(attendanceSession.id),
          qr_expires_at: attendanceSession.session_expires_at,
        })
        .eq("id", attendanceSession.id);
    }

    return NextResponse.json({ error: "Attendance session is closed" }, { status: 410 });
  }

  const sessionExpiresAt = new Date(attendanceSession.session_expires_at);

  let rotation: ReturnType<typeof buildRotatedQRToken>;
  try {
    rotation = buildRotatedQRToken({
      attendanceSessionId: attendanceSession.id,
      classSessionId: attendanceSession.class_session_id,
      sessionExpiresAt,
    });
  } catch {
    return NextResponse.json(
      { error: "QR attendance is not configured on the server." },
      { status: 500 }
    );
  }

  const service = await createServiceClient();
  // Atomic single-token policy: replacing qr_token_hash immediately invalidates the previous QR.
  const { error: updateError } = await service
    .from("attendance_sessions")
    .update({
      qr_token_hash: rotation.tokenHash,
      qr_expires_at: rotation.tokenExpiresAt.toISOString(),
    })
    .eq("id", attendanceSession.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const appUrl = resolveAppUrl(request);

  return NextResponse.json({
    qrToken: rotation.token,
    qrPayload: buildScanUrl(appUrl, rotation.token),
    tokenExpiresAt: rotation.tokenExpiresAt.toISOString(),
    sessionExpiresAt: attendanceSession.session_expires_at,
  });
}
