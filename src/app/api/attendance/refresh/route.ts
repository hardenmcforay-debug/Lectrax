import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { isAttendanceSessionOpen } from "@/lib/attendance/constants";
import { closeAttendanceSessionIfAbandoned } from "@/lib/attendance/close-session";
import { buildRotatedQRToken, buildScanUrl } from "@/lib/attendance/qr-rotation";
import {
  getAttendanceSessionForLecturer,
} from "@/lib/attendance/sessions";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { uuidField } from "@/lib/security/zod-helpers";
import { withApiObservability } from "@/lib/observability/with-api-observability";

const refreshSchema = z.object({
  attendanceSessionId: uuidField(),
});

function resolveAppUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
}

async function postHandler(request: Request) {
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
    await closeAttendanceSessionIfAbandoned(supabase, attendanceSession);
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

  // Atomic single-token policy: replacing qr_token_hash immediately invalidates the previous QR.
  const { error: updateError } = await supabase
    .from("attendance_sessions")
    .update({
      qr_token_hash: rotation.tokenHash,
      qr_expires_at: rotation.tokenExpiresAt.toISOString(),
    })
    .eq("id", attendanceSession.id);

  if (updateError) {
    return NextResponse.json({ error: sanitizeErrorMessage(updateError.message) }, { status: 500 });
  }

  const appUrl = resolveAppUrl(request);

  return NextResponse.json({
    qrToken: rotation.token,
    qrPayload: buildScanUrl(appUrl, rotation.token),
    tokenExpiresAt: rotation.tokenExpiresAt.toISOString(),
    sessionExpiresAt: attendanceSession.session_expires_at,
  });
}

export const POST = withApiObservability("attendance.refresh.post", postHandler);
