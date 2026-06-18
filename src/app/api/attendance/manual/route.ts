import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { isAttendanceSessionOpen } from "@/lib/attendance/constants";
import { getAttendanceSessionForLecturer } from "@/lib/attendance/sessions";
import { requireWritableSubscription, subscriptionGuardResponse } from "@/lib/subscription/guards";
import { requireLecturerRole } from "@/lib/auth/require-api-role";

const manualSchema = z.object({
  attendanceSessionId: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  classSessionId: z.string().uuid(),
});

async function validateManualAttendanceRequest(
  userId: string,
  attendanceSessionId: string,
  enrollmentId: string,
  classSessionId: string
) {
  const writeGuard = await requireWritableSubscription(userId);
  if (!writeGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(writeGuard);
    return { error: NextResponse.json({ error, code }, { status }) };
  }

  const attendanceSession = await getAttendanceSessionForLecturer(attendanceSessionId, userId);
  if (!attendanceSession || attendanceSession.class_session_id !== classSessionId) {
    return { error: NextResponse.json({ error: "Attendance session not found" }, { status: 404 }) };
  }

  if (!isAttendanceSessionOpen(attendanceSession)) {
    return {
      error: NextResponse.json(
        { error: "Attendance collection has ended for this session." },
        { status: 410 }
      ),
    };
  }

  const service = await createServiceClient();
  const { data: enrollment } = await service
    .from("enrollments")
    .select("id")
    .eq("id", enrollmentId)
    .eq("class_session_id", classSessionId)
    .maybeSingle();

  if (!enrollment) {
    return {
      error: NextResponse.json(
        { error: "Enrollment not found for this class session." },
        { status: 404 }
      ),
    };
  }

  return { attendanceSession };
}

export async function POST(request: Request) {
  const auth = await requireLecturerRole();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = manualSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid manual attendance data" }, { status: 400 });
  }

  const { attendanceSessionId, enrollmentId, classSessionId } = parsed.data;

  const validation = await validateManualAttendanceRequest(
    auth.userId,
    attendanceSessionId,
    enrollmentId,
    classSessionId
  );
  if (validation.error) return validation.error;

  const { data: existing } = await auth.supabase
    .from("attendance_records")
    .select("id")
    .eq("attendance_session_id", attendanceSessionId)
    .eq("enrollment_id", enrollmentId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Attendance Already Recorded", message: "Attendance Already Recorded" },
      { status: 409 }
    );
  }

  const { data: record, error } = await auth.supabase
    .from("attendance_records")
    .insert({
      attendance_session_id: attendanceSessionId,
      enrollment_id: enrollmentId,
      class_session_id: classSessionId,
      mark_method: "manual",
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
    classSessionId,
    metadata: {
      enrollment_id: enrollmentId,
      attendance_session_id: attendanceSessionId,
      mark_method: "manual",
    },
  });

  return NextResponse.json({
    success: true,
    message: "Attendance Recorded Successfully",
    record,
  });
}

export async function DELETE(request: Request) {
  const auth = await requireLecturerRole();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = manualSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid attendance data" }, { status: 400 });
  }

  const { attendanceSessionId, enrollmentId, classSessionId } = parsed.data;

  const validation = await validateManualAttendanceRequest(
    auth.userId,
    attendanceSessionId,
    enrollmentId,
    classSessionId
  );
  if (validation.error) return validation.error;

  const service = auth.service;

  const { data: record, error: fetchError } = await service
    .from("attendance_records")
    .select("id, mark_method, enrollment_id")
    .eq("attendance_session_id", attendanceSessionId)
    .eq("enrollment_id", enrollmentId)
    .eq("class_session_id", classSessionId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!record) {
    return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });
  }

  if (record.mark_method === "qr_scan" || record.mark_method === "device_verified") {
    return NextResponse.json(
      {
        error:
          "This student marked attendance through QR scanning and cannot be removed from the Manual Attendance panel.",
      },
      { status: 403 }
    );
  }

  const { data: enrollment } = await service
    .from("enrollments")
    .select("student_id, manual_student_id")
    .eq("id", enrollmentId)
    .maybeSingle();

  const { error: deleteError } = await service
    .from("attendance_records")
    .delete()
    .eq("id", record.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await logAudit({
    action: "attendance_removed",
    entityType: "attendance_record",
    entityId: record.id,
    classSessionId,
    metadata: {
      enrollment_id: enrollmentId,
      attendance_session_id: attendanceSessionId,
      student_id: enrollment?.student_id ?? null,
      manual_student_id: enrollment?.manual_student_id ?? null,
      previous_mark_method: record.mark_method,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Attendance removed for this session.",
  });
}
