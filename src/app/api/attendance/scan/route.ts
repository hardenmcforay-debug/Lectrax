import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyQRToken, hashQRToken } from "@/lib/qr-token";
import { logAudit } from "@/lib/audit";
import { EXPIRED_QR_MESSAGE, isAttendanceSessionOpen } from "@/lib/attendance/constants";
import {
  attendanceDeviceIdentitySchema,
  DEVICE_MESSAGES,
  DEVICE_VERIFICATION_CODES,
  type DeviceVerificationStatus,
} from "@/lib/attendance/device-verification";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const identityParsed = attendanceDeviceIdentitySchema.safeParse({
    deviceFingerprint: body.deviceFingerprint,
    browserFingerprint: body.browserFingerprint,
    deviceIdentifier: body.deviceIdentifier,
    deviceMetadata: body.deviceMetadata,
  });

  if (!identityParsed.success) {
    return NextResponse.json({ error: "Invalid device identity" }, { status: 400 });
  }

  const { token, latitude, longitude } = body;
  const { deviceFingerprint, browserFingerprint, deviceIdentifier, deviceMetadata } =
    identityParsed.data;

  const payload = verifyQRToken(token);

  if (!payload) {
    return NextResponse.json({ error: EXPIRED_QR_MESSAGE, message: EXPIRED_QR_MESSAGE }, { status: 400 });
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

  const tokenHash = hashQRToken(token);
  const isCurrentToken = attSession.qr_token_hash === tokenHash;
  const tokenNotExpired = new Date(attSession.qr_expires_at) >= new Date();

  if (!isCurrentToken || !tokenNotExpired) {
    return NextResponse.json(
      { error: EXPIRED_QR_MESSAGE, message: EXPIRED_QR_MESSAGE },
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
    .select("id")
    .eq("attendance_session_id", payload.attendanceSessionId)
    .eq("enrollment_id", enrollment.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Attendance Already Recorded", message: "Attendance Already Recorded" },
      { status: 409 }
    );
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
    return NextResponse.json({ error: verifyError.message }, { status: 400 });
  }

  const status = verificationStatus as DeviceVerificationStatus;

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

    if (registerError || registerStatus !== "registered") {
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
      return NextResponse.json(
        { error: "Attendance Already Recorded", message: "Attendance Already Recorded" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
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
    message: "Attendance Recorded Successfully",
    record,
  });
}
