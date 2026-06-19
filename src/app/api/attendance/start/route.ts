import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  DEFAULT_SESSION_DURATION_MINUTES,
} from "@/lib/attendance/constants";
import { buildRotatedQRToken, buildScanUrl } from "@/lib/attendance/qr-rotation";
import { getAttendanceSessionNumber } from "@/lib/attendance/sessions";
import { requireWritableSubscription, subscriptionGuardResponse } from "@/lib/subscription/guards";
import {
  getClassSessionLabel,
  notifyEnrolledStudentsInClass,
} from "@/lib/student/notifications";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { isUniqueViolation } from "@/lib/db/postgres-errors";
import { parseJsonBody } from "@/lib/security/parse-request";
import { attendanceStartSchema } from "@/lib/validations";

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

  const writeGuard = await requireWritableSubscription(user.id);
  if (!writeGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(writeGuard);
    return NextResponse.json({ error, code }, { status });
  }

  let body: unknown;
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;
  body = parsedBody.body;

  const parsed = attendanceStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid attendance session data" },
      { status: 400 }
    );
  }

  const { classSessionId, title, durationMinutes, requireGps } = parsed.data;
  const service = await createServiceClient();

  const [{ data: profile }, { data: classSession }, { data: existingActive }] = await Promise.all([
    service.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    service
      .from("class_sessions")
      .select("id")
      .eq("id", classSessionId)
      .eq("lecturer_id", user.id)
      .maybeSingle(),
    service
      .from("attendance_sessions")
      .select("id")
      .eq("class_session_id", classSessionId)
      .eq("lecturer_id", user.id)
      .eq("is_active", true)
      .is("ended_at", null)
      .gt("session_expires_at", new Date().toISOString())
      .maybeSingle(),
  ]);

  if (profile?.role !== "lecturer") {
    return NextResponse.json({ error: "Only lecturers can start attendance" }, { status: 403 });
  }

  if (!classSession) {
    return NextResponse.json({ error: "Class session not found" }, { status: 404 });
  }

  if (existingActive) {
    return NextResponse.json(
      { error: "An attendance session is already active. End it before starting a new one." },
      { status: 409 }
    );
  }

  const sessionExpiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
  const sessionTitle =
    title?.trim() ||
    `Attendance ${new Date().toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;

  const sessionId = randomUUID();

  let finalRotation: ReturnType<typeof buildRotatedQRToken>;
  try {
    finalRotation = buildRotatedQRToken({
      attendanceSessionId: sessionId,
      classSessionId,
      sessionExpiresAt,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "QR attendance is not configured on the server. Set QR_TOKEN_SECRET (min 32 characters) in your environment.",
      },
      { status: 500 }
    );
  }

  const { data: session, error: insertError } = await service
    .from("attendance_sessions")
    .insert({
      id: sessionId,
      class_session_id: classSessionId,
      lecturer_id: user.id,
      title: sessionTitle,
      qr_token_hash: finalRotation.tokenHash,
      qr_expires_at: finalRotation.tokenExpiresAt.toISOString(),
      session_expires_at: sessionExpiresAt.toISOString(),
      require_gps: requireGps,
      is_active: true,
    })
    .select("id, title, session_date, created_at, session_expires_at")
    .single();

  if (insertError || !session) {
    if (isUniqueViolation(insertError)) {
      return NextResponse.json(
        { error: "An attendance session is already active. End it before starting a new one." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: sanitizeErrorMessage(insertError?.message ?? "Could not start attendance session") },
      { status: 500 }
    );
  }

  void logAudit({
    action: "attendance_session_started",
    entityType: "attendance_session",
    entityId: session.id,
    classSessionId,
    metadata: {
      session_expires_at: sessionExpiresAt.toISOString(),
      duration_minutes: durationMinutes,
    },
  });

  const sessionNumber = await getAttendanceSessionNumber(
    classSessionId,
    session.created_at,
    service
  );

  const appUrl = resolveAppUrl(request);

  const classLabel = await getClassSessionLabel(service, classSessionId);
  void notifyEnrolledStudentsInClass(service, classSessionId, {
    type: "attendance",
    referenceId: session.id,
    title: "Attendance is open",
    message: `QR attendance is now open for ${classLabel}. Open Scan to mark present.`,
  });

  return NextResponse.json({
    session: {
      ...session,
      session_expires_at: sessionExpiresAt.toISOString(),
      qr_expires_at: finalRotation.tokenExpiresAt.toISOString(),
    },
    sessionNumber,
    qrToken: finalRotation.token,
    qrPayload: buildScanUrl(appUrl, finalRotation.token),
    tokenExpiresAt: finalRotation.tokenExpiresAt.toISOString(),
  });
}
