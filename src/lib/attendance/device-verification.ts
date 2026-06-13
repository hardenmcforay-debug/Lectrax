import { z } from "zod";

export const DEVICE_VERIFICATION_CODES = {
  VERIFICATION_REQUIRED: "DEVICE_VERIFICATION_REQUIRED",
  ACCESS_REVOKED: "DEVICE_ACCESS_REVOKED",
} as const;

export type DeviceVerificationStatus =
  | "authorized"
  | "new_device"
  | "revoked_device"
  | "no_device"
  | "not_student";

export const attendanceDeviceIdentitySchema = z.object({
  deviceFingerprint: z.string().min(8),
  browserFingerprint: z.string().min(8),
  deviceIdentifier: z.string().min(8),
  deviceMetadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export type AttendanceDeviceIdentityInput = z.infer<typeof attendanceDeviceIdentitySchema>;

export const DEVICE_MESSAGES = {
  verificationRequired: {
    title: "Attendance Device Verification Required",
    description:
      "Attendance scanning is currently linked to another device. To continue scanning attendance from this device, you must transfer attendance access from your previous device. Once transferred, attendance scanning will no longer be available on the previous device.",
  },
  transferWarning:
    "Attendance scanning is linked to another device. Transferring attendance access will disable attendance scanning on the previous device. Continue?",
  transferSuccess:
    "Attendance device updated successfully. You can now use this device to scan attendance QR codes.",
  accessRevoked: {
    title: "Attendance Access Removed",
    description:
      "Attendance scanning has been transferred to another device. You cannot mark attendance with this device.",
    detail:
      "Attendance scanning is no longer available on this device because attendance access has been transferred to another device.",
  },
} as const;
