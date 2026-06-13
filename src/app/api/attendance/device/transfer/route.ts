import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  attendanceDeviceIdentitySchema,
  DEVICE_MESSAGES,
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
  const parsed = attendanceDeviceIdentitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid device identity" }, { status: 400 });
  }

  const { deviceFingerprint, browserFingerprint, deviceIdentifier, deviceMetadata } = parsed.data;

  const { data: transferId, error } = await supabase.rpc("transfer_student_attendance_device", {
    p_device_fingerprint: deviceFingerprint,
    p_browser_fingerprint: browserFingerprint,
    p_device_identifier: deviceIdentifier,
    p_device_metadata: deviceMetadata ?? {},
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAudit({
    action: "attendance_device_transferred",
    entityType: "attendance_device_transfer",
    entityId: transferId as string,
    metadata: {
      student_id: user.id,
      to_device_identifier: deviceIdentifier,
      to_device_fingerprint: deviceFingerprint,
    },
  });

  return NextResponse.json({
    success: true,
    transferId,
    message: DEVICE_MESSAGES.transferSuccess,
  });
}
