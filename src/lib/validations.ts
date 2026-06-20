import { z } from "zod";
import {
  attendanceDeviceIdentitySchema,
} from "@/lib/attendance/device-verification";
import {
  DEFAULT_SESSION_DURATION_MINUTES,
  MAX_SESSION_DURATION_MINUTES,
  MIN_SESSION_DURATION_MINUTES,
} from "@/lib/attendance/constants";
import {
  emailField,
  FIELD_LIMITS,
  optionalPhoneField,
  optionalSanitizedString,
  passwordField,
  requiredPhoneField,
  sanitizedRequiredString,
  sessionCodeField,
} from "@/lib/security/zod-helpers";

export const loginSchema = z.object({
  email: emailField,
  password: passwordField(6, "Password must be at least 6 characters"),
});

export const signupSchema = z
  .object({
    fullName: sanitizedRequiredString({
      min: 2,
      max: FIELD_LIMITS.FULL_NAME,
      minMessage: "Name is required",
    }),
    email: emailField,
    password: passwordField(8, "Password must be at least 8 characters"),
    confirmPassword: passwordField(8, "Please confirm your password"),
    role: z.enum(["lecturer", "student"]),
    collegeId: optionalSanitizedString(FIELD_LIMITS.COLLEGE_ID),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const profileUpdateSchema = z.object({
  fullName: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.FULL_NAME,
    minMessage: "Name is required",
  }),
  phone: optionalPhoneField,
  collegeId: optionalSanitizedString(FIELD_LIMITS.COLLEGE_ID),
});

export const passwordChangeSchema = z
  .object({
    password: passwordField(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const classSessionSchema = z.object({
  className: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.CLASS_NAME,
    minMessage: "Class is required",
  }),
  title: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.TITLE,
    minMessage: "Course title is required",
  }),
  courseCode: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.COURSE_CODE,
    minMessage: "Course code is required",
  }),
  semester: z.enum(["first_semester", "second_semester", "full_year"]),
  academicYear: sanitizedRequiredString({
    min: 4,
    max: FIELD_LIMITS.ACADEMIC_YEAR,
    minMessage: "Academic year is required",
  }),
});

export const assignmentSchema = z.object({
  title: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.TITLE,
    minMessage: "Title is required",
  }),
  description: optionalSanitizedString(FIELD_LIMITS.DESCRIPTION),
  maxScore: z.coerce.number().int().min(1).max(1000),
  deadline: z.string().min(1, "Deadline is required"),
});

export const caConfigSchema = z.object({
  attendanceWeight: z.coerce.number().int().min(0).max(100),
  assignmentWeight: z.coerce.number().int().min(0).max(100),
  testWeight: z.coerce.number().int().min(0).max(100),
});

export const manualStudentSchema = z.object({
  fullName: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.FULL_NAME,
    minMessage: "Student name is required",
  }),
  collegeId: optionalSanitizedString(FIELD_LIMITS.COLLEGE_ID),
});

export const joinSessionSchema = z.object({
  sessionCode: sessionCodeField,
});

export const classTestSchema = z.object({
  testNumber: z.union([z.literal(1), z.literal(2)]),
  title: sanitizedRequiredString({
    min: 1,
    max: 120,
    minMessage: "Test name is required",
  }),
  maxScore: z.coerce.number().int().min(1).max(1000),
  weightPercent: z.coerce.number().min(0).max(100).optional().nullable(),
});

/** Maximum grade/score rows accepted per bulk save request. */
export const BULK_GRADE_ENTRY_MAX = 500;

export const attendanceScanSchema = attendanceDeviceIdentitySchema.extend({
  token: z.string().min(1, "QR token is required").max(2048, "QR token is too long"),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
});

export const attendanceStartSchema = z.object({
  classSessionId: z.string().uuid(),
  title: optionalSanitizedString(FIELD_LIMITS.TITLE).optional(),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(MIN_SESSION_DURATION_MINUTES)
    .max(MAX_SESSION_DURATION_MINUTES)
    .default(DEFAULT_SESSION_DURATION_MINUTES),
  requireGps: z.boolean().optional().default(false),
});

export const exportStudentPerformanceSchema = z
  .object({
    attendanceWeight: z.coerce.number().int().min(0).max(100).optional(),
    assignmentWeight: z.coerce.number().int().min(0).max(100).optional(),
    testWeight: z.coerce.number().int().min(0).max(100).optional(),
  })
  .refine(
    (data) => {
      const keys = [data.attendanceWeight, data.assignmentWeight, data.testWeight];
      const provided = keys.filter((value) => value !== undefined).length;
      return provided === 0 || provided === 3;
    },
    { message: "Provide all CA weight overrides or none." }
  );

export const testScoresBulkSchema = z.object({
  scores: z
    .array(
      z.object({
        enrollmentId: z.string().uuid(),
        score: z.coerce.number().min(0),
      })
    )
    .max(BULK_GRADE_ENTRY_MAX, `Cannot save more than ${BULK_GRADE_ENTRY_MAX} grades at once`)
    .default([]),
  deleteEnrollmentIds: z
    .array(z.string().uuid())
    .max(BULK_GRADE_ENTRY_MAX, `Cannot clear more than ${BULK_GRADE_ENTRY_MAX} grades at once`)
    .optional(),
});

export const monimeWebhookEventSchema = z.object({
  apiVersion: z.string().max(40).optional(),
  type: z.string().max(120).optional(),
  event: z
    .object({
      id: z.string().max(200).optional(),
      name: z.string().max(120).optional(),
      timestamp: z.string().max(20).optional(),
    })
    .optional(),
  object: z
    .object({
      id: z.string().max(200).optional(),
      type: z.string().max(80).optional(),
    })
    .optional(),
  data: z
    .object({
      reference: z.string().max(200).optional(),
      id: z.string().max(200).optional(),
      status: z.string().max(80).optional(),
      paymentStatus: z.string().max(80).optional(),
      metadata: z
        .object({
          payment_id: z.string().uuid().optional(),
          lecturer_id: z.string().uuid().optional(),
          billing_plan: z.enum(["monthly", "semester", "annual"]).optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .optional(),
});

export const studentRowsWeightQuerySchema = z
  .object({
    attendanceWeight: z.coerce.number().int().min(0).max(100),
    assignmentWeight: z.coerce.number().int().min(0).max(100),
    testWeight: z.coerce.number().int().min(0).max(100),
  })
  .refine(
    (data) => data.attendanceWeight + data.assignmentWeight + data.testWeight <= 100,
    { message: "CA weight overrides cannot exceed 100% combined." }
  );

export const contactInquirySchema = z.object({
  fullName: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.FULL_NAME,
    minMessage: "Name is required",
  }),
  email: emailField,
  subject: sanitizedRequiredString({
    min: 3,
    max: FIELD_LIMITS.SUBJECT,
    minMessage: "Subject is required",
  }),
  message: sanitizedRequiredString({
    min: 10,
    max: FIELD_LIMITS.MESSAGE,
    minMessage: "Message must be at least 10 characters",
  }),
});

export const partnershipInquirySchema = z.object({
  universityName: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.UNIVERSITY_NAME,
    minMessage: "University name is required",
  }),
  departmentName: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.DEPARTMENT_NAME,
    minMessage: "Department name is required",
  }),
  contactPerson: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.FULL_NAME,
    minMessage: "Contact person is required",
  }),
  positionRole: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.POSITION_ROLE,
    minMessage: "Position or role is required",
  }),
  email: emailField,
  phoneNumber: requiredPhoneField,
  expectedLecturers: z.coerce
    .number()
    .int("Expected lecturers must be a whole number")
    .min(1, "Expected lecturers must be at least 1")
    .max(10000, "Expected lecturers value is too large"),
  selectedPackage: z.enum(["small", "medium", "large"]),
  additionalNotes: optionalSanitizedString(FIELD_LIMITS.NOTES),
});

export const adminToggleLecturerSchema = z.object({
  lecturerId: z.string().uuid("Invalid lecturer ID"),
  isActive: z.boolean(),
});

export const adminGrantFreeSchema = z.object({
  lecturerId: z.string().uuid("Invalid lecturer ID"),
  days: z.coerce.number().int().min(1).max(3650).default(365),
});

export const adminExtendSubscriptionSchema = z
  .object({
    subscriptionId: z.string().uuid("Invalid subscription ID").optional(),
    lecturerId: z.string().uuid("Invalid lecturer ID").optional(),
    days: z.coerce.number().int().min(1).max(3650).default(30),
  })
  .refine((data) => Boolean(data.lecturerId || data.subscriptionId), {
    message: "lecturerId or subscriptionId required",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ClassSessionInput = z.infer<typeof classSessionSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;
export type PartnershipInquiryInput = z.infer<typeof partnershipInquirySchema>;
export type ManualStudentInput = z.infer<typeof manualStudentSchema>;
export type JoinSessionInput = z.infer<typeof joinSessionSchema>;
export type ClassTestInput = z.infer<typeof classTestSchema>;
