import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  attendanceDeviceIdentitySchema,
  deviceBoundToOtherAccountResponse,
} from "@/lib/attendance/device-verification";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { parseJsonBody } from "@/lib/security/parse-request";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = attendanceDeviceIdentitySchema.safeParse(parsedBody.body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid device identity" }, { status: 400 });
  }

  const { deviceFingerprint, browserFingerprint, deviceIdentifier, deviceMetadata } = parsed.data;

  const { data: status, error } = await supabase.rpc("register_student_attendance_device", {
    p_device_fingerprint: deviceFingerprint,
    p_browser_fingerprint: browserFingerprint,
    p_device_identifier: deviceIdentifier,
    p_device_metadata: deviceMetadata ?? {},
  });

  if (error) {
    return NextResponse.json({ error: sanitizeErrorMessage(error.message) }, { status: 400 });
  }

  if (status === "not_student") {
    return NextResponse.json({ error: "Only students can register attendance devices" }, { status: 403 });
  }

  if (status === "device_owned_by_other") {
    return NextResponse.json(deviceBoundToOtherAccountResponse(), { status: 403 });
  }

  if (status === "already_registered") {
    return NextResponse.json({ success: true, status: "already_registered" });
  }

  await logAudit({
    action: "attendance_device_registered",
    entityType: "device_registration",
    metadata: {
      student_id: user.id,
      device_identifier: deviceIdentifier,
      device_fingerprint: deviceFingerprint,
    },
  });

  return NextResponse.json({ success: true, status: "registered" });
}
