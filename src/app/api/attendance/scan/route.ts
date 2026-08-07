import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyQRToken, hashQRToken } from "@/lib/qr-token";
import { requireStudentRole } from "@/lib/auth/require-api-role";
import { rejectIfUserRateLimited, rejectIfDeviceRateLimited } from "@/lib/security/enforce-rate-limit";
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
  QR_TOKEN_CLOCK_SKEW_MS,
} from "@/lib/attendance/constants";
import { closeAttendanceSessionIfAbandoned } from "@/lib/attendance/close-session";
import { createServiceClient } from "@/lib/supabase/server";
import {
  DEVICE_MESSAGES,
  DEVICE_VERIFICATION_CODES,
  deviceBoundToOtherAccountResponse,
  type DeviceVerificationStatus,
} from "@/lib/attendance/device-verification";
import { attendanceScanSchema } from "@/lib/validations";
import { parseJsonBody } from "@/lib/security/parse-request";
import { withApiObservability } from "@/lib/observability/with-api-observability";

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

type MarkAttendanceRpcRow = {
  record_id: string;
  marked_at: string;
  already_recorded: boolean;
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

function mapMarkRpcError(message: string): NextResponse | null {
  const lower = message.toLowerCase();
  if (lower.includes("qr token is no longer valid") || lower.includes("collection has ended")) {
    return NextResponse.json(
      {
        error: EXPIRED_QR_TITLE,
        message: EXPIRED_QR_MESSAGE,
        code: "QR_EXPIRED",
      },
      { status: 410 }
    );
  }
  if (lower.includes("class mismatch")) {
    return NextResponse.json({ error: "Invalid attendance token binding." }, { status: 400 });
  }
  if (lower.includes("not enrolled")) {
    return NextResponse.json({ error: "You are not enrolled in this class." }, { status: 403 });
  }
  return null;
}

async function postHandler(request: Request) {
  const auth = await requireStudentRole();
  if (auth.error) return auth.error;

  const userRateLimit = await rejectIfUserRateLimited(
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
    deviceFingerprint,
    browserFingerprint,
    deviceIdentifier,
    deviceMetadata,
  } = scanParsed.data;

  const deviceRateLimit = await rejectIfDeviceRateLimited(
    deviceIdentifier,
    "attendanceScanPerDevice",
    "attendance-scan-device"
  );
  if (deviceRateLimit) return deviceRateLimit;

  const qrVerifyLimit = await rejectIfDeviceRateLimited(
    deviceIdentifier,
    "qrVerification",
    "attendance-qr-verify"
  );
  if (qrVerifyLimit) return qrVerifyLimit;

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

  // Cryptographic payload must bind to the live session's class — prevents
  // splicing a valid HMAC onto a different class's attendance session id.
  if (attSession.class_session_id !== payload.classSessionId) {
    await logAudit({
      action: "attendance_scan_class_binding_mismatch",
      entityType: "attendance_session",
      entityId: payload.attendanceSessionId,
      classSessionId: payload.classSessionId,
      metadata: {
        student_id: user.id,
        token_class_session_id: payload.classSessionId,
        session_class_session_id: attSession.class_session_id,
      },
    });
    return NextResponse.json({ error: "Invalid attendance token binding." }, { status: 400 });
  }

  if (
    !isAttendanceSessionOpen(attSession) ||
    (await closeAttendanceSessionIfAbandoned(await createServiceClient(), attSession))
  ) {
    return NextResponse.json(
      { error: "Attendance collection has ended for this session." },
      { status: 410 }
    );
  }

  const tokenHash = hashQRToken(token);
  const isCurrentToken = attSession.qr_token_hash === tokenHash;
  const tokenNotExpired =
    new Date(attSession.qr_expires_at).getTime() + QR_TOKEN_CLOCK_SKEW_MS >= Date.now();

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

  // Atomic mark via SECURITY DEFINER RPC — students have no direct INSERT policy.
  const { data: markRows, error: markError } = await supabase.rpc(
    "mark_attendance_from_verified_scan",
    {
      p_attendance_session_id: payload.attendanceSessionId,
      p_class_session_id: payload.classSessionId,
      p_enrollment_id: enrollment.id,
      p_device_fingerprint: deviceFingerprint,
      p_browser_fingerprint: browserFingerprint,
      p_device_identifier: deviceIdentifier,
      p_qr_token_hash: tokenHash,
    }
  );

  if (markError) {
    const mapped = mapMarkRpcError(markError.message);
    if (mapped) return mapped;
    return NextResponse.json({ error: sanitizeErrorMessage(markError.message) }, { status: 400 });
  }

  const markResult = (Array.isArray(markRows) ? markRows[0] : markRows) as
    | MarkAttendanceRpcRow
    | null
    | undefined;

  if (!markResult?.record_id) {
    return NextResponse.json({ error: "Could not record attendance." }, { status: 500 });
  }

  if (markResult.already_recorded) {
    return respondDuplicateAttendance(supabase, {
      userId: user.id,
      attendanceSessionId: payload.attendanceSessionId,
      classSessionId: payload.classSessionId,
      enrollmentId: enrollment.id,
      deviceFingerprint,
      browserFingerprint,
      deviceIdentifier,
      existingRecordId: markResult.record_id,
      existingMarkedAt: markResult.marked_at,
    });
  }

  await logAudit({
    action: "attendance_marked_present",
    entityType: "attendance_record",
    entityId: markResult.record_id,
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
    recordedAt: markResult.marked_at,
    record: {
      id: markResult.record_id,
      marked_at: markResult.marked_at,
      attendance_session_id: payload.attendanceSessionId,
      enrollment_id: enrollment.id,
      class_session_id: payload.classSessionId,
      mark_method: "device_verified",
    },
  });
}

export const POST = withApiObservability("attendance.scan.post", postHandler);
