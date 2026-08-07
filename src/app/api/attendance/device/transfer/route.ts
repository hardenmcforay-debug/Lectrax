import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  attendanceDeviceIdentitySchema,
  DEVICE_MESSAGES,
  DEVICE_VERIFICATION_CODES,
  deviceBoundToOtherAccountResponse,
  isDeviceOwnedByOtherError,
} from "@/lib/attendance/device-verification";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { parseJsonBody } from "@/lib/security/parse-request";
import { rejectIfUserRateLimited } from "@/lib/security/enforce-rate-limit";
import { withApiObservability } from "@/lib/observability/with-api-observability";

async function postHandler(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRateLimit = await rejectIfUserRateLimited(
    user.id,
    "attendanceScanPerUser",
    "attendance-device-transfer"
  );
  if (userRateLimit) return userRateLimit;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = attendanceDeviceIdentitySchema.safeParse(parsedBody.body);

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
    if (isDeviceOwnedByOtherError(error.message)) {
      return NextResponse.json(deviceBoundToOtherAccountResponse(), { status: 403 });
    }
    if (/ATTENDANCE_DEVICE_TRANSFER_LIMIT/i.test(error.message)) {
      return NextResponse.json(
        {
          error: DEVICE_MESSAGES.transferLimit.title,
          code: DEVICE_VERIFICATION_CODES.TRANSFER_LIMIT,
          message: DEVICE_MESSAGES.transferLimit.description,
        },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: sanitizeErrorMessage(error.message) }, { status: 400 });
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

export const POST = withApiObservability("attendance.device.transfer.post", postHandler);
