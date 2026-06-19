import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyQRToken, hashQRToken } from "@/lib/qr-token";
import { requireStudentRole } from "@/lib/auth/require-api-role";
import { rejectIfUserRateLimited } from "@/lib/security/enforce-rate-limit";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { logAudit } from "@/lib/audit";
import {
  ATTENDANCE_ALREADY_RECORDED_MESSAGE,
  ATTENDANCE_ALREADY_RECORDED_TITLE,
  ATTENDANCE_RECORDED_MESSAGE,
  ATTENDANCE_RECORDED_TITLE,
  EXPIRED_QR_MESSAGE,
  EXPIRED_QR_TITLE,
  isAttendanceSessionOpen,
} from "@/lib/attendance/constants";
import {
  DEVICE_MESSAGES,
  DEVICE_VERIFICATION_CODES,
  deviceBoundToOtherAccountResponse,
  type DeviceVerificationStatus,
} from "@/lib/attendance/device-verification";
import { attendanceScanSchema } from "@/lib/validations";
import { parseJsonBody } from "@/lib/security/parse-request";

type DuplicateScanContext = {
  userId: string;
  attendanceSessionId: string;
  classSessionId: string;
  enrollmentId: string;
  deviceFingerprint: string;
  browserFingerprint: string;
  deviceIdentifier: string;
  existingRecordId?: string;
  existingMarkedAt?: string | null;
};

async function respondDuplicateAttendance(
  supabase: SupabaseClient,
  context: DuplicateScanContext
) {
  let recordId = context.existingRecordId;
  let markedAt = context.existingMarkedAt ?? null;

  if (!markedAt) {
    const { data: existingRecord } = await supabase
      .from("attendance_records")
      .select("id, marked_at")
      .eq("attendance_session_id", context.attendanceSessionId)
      .eq("enrollment_id", context.enrollmentId)
      .maybeSingle();

    recordId = existingRecord?.id ?? recordId;
    markedAt = existingRecord?.marked_at ?? null;
  }

  await logAudit({
    action: "duplicate_attendance_scan_attempt",
    entityType: "attendance_record",
    entityId: recordId,
    classSessionId: context.classSessionId,
    metadata: {
      student_id: context.userId,
      attendance_session_id: context.attendanceSessionId,
      enrollment_id: context.enrollmentId,
      class_session_id: context.classSessionId,
      device_identifier: context.deviceIdentifier,
      device_fingerprint: context.deviceFingerprint,
      browser_fingerprint: context.browserFingerprint,
      scanned_at: new Date().toISOString(),
    },
  });

  return NextResponse.json(
    {
      error: ATTENDANCE_ALREADY_RECORDED_TITLE,
      message: ATTENDANCE_ALREADY_RECORDED_MESSAGE,
      code: "ATTENDANCE_ALREADY_RECORDED",
      alreadyRecorded: true,
      recordedAt: markedAt,
    },
    { status: 409 }
  );
}

export async function POST(request: Request) {
  const auth = await requireStudentRole();
  if (auth.error) return auth.error;

  const userRateLimit = rejectIfUserRateLimited(
    auth.userId,
    "attendanceScanPerUser",
    "attendance-scan-user"
  );
  if (userRateLimit) return userRateLimit;

  const supabase = auth.supabase;
  const user = auth.user;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const scanParsed = attendanceScanSchema.safeParse(parsedBody.body);
  if (!scanParsed.success) {
    return NextResponse.json({ error: "Invalid attendance scan request" }, { status: 400 });
  }

  const {
    token,
    latitude,
    longitude,
    deviceFingerprint,
    browserFingerprint,
    deviceIdentifier,
    deviceMetadata,
  } = scanParsed.data;

  const payload = verifyQRToken(token);

  if (!payload) {
    return NextResponse.json(
      {
        error: EXPIRED_QR_TITLE,
        message: EXPIRED_QR_MESSAGE,
        code: "QR_EXPIRED",
      },
      { status: 400 }
    );
  }

  const { data: attSession } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("id", payload.attendanceSessionId)
    .single();

  if (!attSession) {
    return NextResponse.json({ error: "Attendance session not found" }, { status: 400 });
  }

  if (!isAttendanceSessionOpen(attSession)) {
    return NextResponse.json(
      { error: "Attendance collection has ended for this session." },
      { status: 410 }
    );
  }

  if (attSession.require_gps) {
    if (latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "Location is required to mark attendance for this session." },
        { status: 400 }
      );
    }
  }

  const tokenHash = hashQRToken(token);
  const isCurrentToken = attSession.qr_token_hash === tokenHash;
  const tokenNotExpired = new Date(attSession.qr_expires_at) >= new Date();

  if (!isCurrentToken || !tokenNotExpired) {
    return NextResponse.json(
      {
        error: EXPIRED_QR_TITLE,
        message: EXPIRED_QR_MESSAGE,
        code: "QR_EXPIRED",
      },
      { status: 400 }
    );
  }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("class_session_id", payload.classSessionId)
    .eq("student_id", user.id)
    .single();

  if (!enrollment) {
    return NextResponse.json(
      { error: "You are not enrolled in this class." },
      { status: 403 }
    );
  }

  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, marked_at")
    .eq("attendance_session_id", payload.attendanceSessionId)
    .eq("enrollment_id", enrollment.id)
    .maybeSingle();

  if (existing) {
    return respondDuplicateAttendance(supabase, {
      userId: user.id,
      attendanceSessionId: payload.attendanceSessionId,
      classSessionId: payload.classSessionId,
      enrollmentId: enrollment.id,
      deviceFingerprint,
      browserFingerprint,
      deviceIdentifier,
      existingRecordId: existing.id,
      existingMarkedAt: existing.marked_at,
    });
  }

  const { data: verificationStatus, error: verifyError } = await supabase.rpc(
    "verify_student_attendance_device",
    {
      p_device_fingerprint: deviceFingerprint,
      p_browser_fingerprint: browserFingerprint,
      p_device_identifier: deviceIdentifier,
    }
  );

  if (verifyError) {
    return NextResponse.json({ error: sanitizeErrorMessage(verifyError.message) }, { status: 400 });
  }

  const status = verificationStatus as DeviceVerificationStatus;

  if (status === "device_owned_by_other") {
    await logAudit({
      action: "attendance_scan_blocked_device_bound",
      entityType: "device_registration",
      classSessionId: payload.classSessionId,
      metadata: {
        student_id: user.id,
        device_identifier: deviceIdentifier,
        device_fingerprint: deviceFingerprint,
        attendance_session_id: payload.attendanceSessionId,
      },
    });

    return NextResponse.json(deviceBoundToOtherAccountResponse(), { status: 403 });
  }

  if (status === "revoked_device") {
    return NextResponse.json(
      {
        error: DEVICE_MESSAGES.accessRevoked.title,
        code: DEVICE_VERIFICATION_CODES.ACCESS_REVOKED,
        message: DEVICE_MESSAGES.accessRevoked.description,
        detail: DEVICE_MESSAGES.accessRevoked.detail,
      },
      { status: 403 }
    );
  }

  if (status === "new_device") {
    return NextResponse.json(
      {
        error: DEVICE_MESSAGES.verificationRequired.title,
        code: DEVICE_VERIFICATION_CODES.VERIFICATION_REQUIRED,
        message: DEVICE_MESSAGES.verificationRequired.description,
      },
      { status: 403 }
    );
  }

  if (status === "no_device") {
    const { data: registerStatus, error: registerError } = await supabase.rpc(
      "register_student_attendance_device",
      {
        p_device_fingerprint: deviceFingerprint,
        p_browser_fingerprint: browserFingerprint,
        p_device_identifier: deviceIdentifier,
        p_device_metadata: deviceMetadata ?? {},
      }
    );

    if (registerError) {
      return NextResponse.json({ error: sanitizeErrorMessage(registerError.message) }, { status: 400 });
    }

    if (registerStatus === "device_owned_by_other") {
      await logAudit({
        action: "attendance_scan_blocked_device_bound",
        entityType: "device_registration",
        classSessionId: payload.classSessionId,
        metadata: {
          student_id: user.id,
          device_identifier: deviceIdentifier,
          device_fingerprint: deviceFingerprint,
          attendance_session_id: payload.attendanceSessionId,
          source: "first_scan_bootstrap",
        },
      });

      return NextResponse.json(deviceBoundToOtherAccountResponse(), { status: 403 });
    }

    if (registerStatus !== "registered") {
      return NextResponse.json(
        { error: "Attendance device registration required before scanning." },
        { status: 403 }
      );
    }

    await logAudit({
      action: "attendance_device_registered",
      entityType: "device_registration",
      metadata: {
        student_id: user.id,
        device_identifier: deviceIdentifier,
        device_fingerprint: deviceFingerprint,
        source: "first_scan_bootstrap",
      },
    });
  }

  await supabase
    .from("device_registrations")
    .update({ last_used_at: new Date().toISOString() })
    .eq("student_id", user.id)
    .eq("device_fingerprint", deviceFingerprint)
    .eq("is_attendance_authority", true)
    .is("archived_at", null);

  const { data: record, error } = await supabase
    .from("attendance_records")
    .insert({
      attendance_session_id: payload.attendanceSessionId,
      enrollment_id: enrollment.id,
      class_session_id: payload.classSessionId,
      mark_method: "device_verified",
      device_fingerprint: deviceFingerprint,
      latitude,
      longitude,
      scan_metadata: {
        scanned_at: new Date().toISOString(),
        browser_fingerprint: browserFingerprint,
        device_identifier: deviceIdentifier,
      },
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return respondDuplicateAttendance(supabase, {
        userId: user.id,
        attendanceSessionId: payload.attendanceSessionId,
        classSessionId: payload.classSessionId,
        enrollmentId: enrollment.id,
        deviceFingerprint,
        browserFingerprint,
        deviceIdentifier,
      });
    }
    return NextResponse.json({ error: sanitizeErrorMessage(error.message) }, { status: 400 });
  }

  await logAudit({
    action: "attendance_marked_present",
    entityType: "attendance_record",
    entityId: record.id,
    classSessionId: payload.classSessionId,
    metadata: {
      enrollment_id: enrollment.id,
      attendance_session_id: payload.attendanceSessionId,
      student_id: user.id,
      mark_method: "device_verified",
      device_identifier: deviceIdentifier,
    },
  });

  return NextResponse.json({
    success: true,
    message: ATTENDANCE_RECORDED_TITLE,
    description: ATTENDANCE_RECORDED_MESSAGE,
    recordedAt: record.marked_at,
    record,
  });
}
