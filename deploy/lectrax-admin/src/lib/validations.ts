import { z } from "zod";
import {
  isEmailIdentifier,
  isValidPhoneInput,
} from "@/lib/auth/phone-number";
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
  optionalEmailField,
  optionalPhoneField,
  optionalSanitizedString,
  passwordField,
  requiredPhoneField,
  sanitizedRequiredString,
  sessionCodeField,
  uuidField,
} from "@/lib/security/zod-helpers";
import { sanitizeTextInput } from "@/lib/security/sanitize";

export const loginIdentifierField = z
  .string({ error: "Phone number or email is required" })
  .transform((value) => sanitizeTextInput(value))
  .pipe(
    z
      .string()
      .min(1, { error: "Phone number or email is required" })
      .refine(
        (value) => isEmailIdentifier(value) || isValidPhoneInput(value),
        { error: "Enter a valid phone number or email address" }
      )
  );

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
    identifier: loginIdentifierField,
    password: passwordField(8, "Password must be at least 8 characters"),
    confirmPassword: passwordField(8, "Please confirm your password"),
    role: z.enum(["lecturer", "student"]),
    collegeId: optionalSanitizedString(FIELD_LIMITS.COLLEGE_ID),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  identifier: emailField,
});

export const profileUpdateSchema = z.object({
  fullName: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.FULL_NAME,
    minMessage: "Name is required",
  }),
  phone: optionalPhoneField,
  collegeId: optionalSanitizedString(FIELD_LIMITS.COLLEGE_ID),
  recoveryEmail: optionalEmailField,
});

export const passwordChangeSchema = z
  .object({
    password: passwordField(8, "Password must be at least 8 characters"),
    confirmPassword: z.string({ error: "Please confirm your password" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match",
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
  // Always a string (empty allowed). Keep input/output types aligned for react-hook-form.
  courseCode: z
    .string({ error: "Course code must be text" })
    .transform((value) => sanitizeTextInput(value))
    .pipe(
      z.string().max(FIELD_LIMITS.COURSE_CODE, { error: "Course code is too long" })
    ),
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
  maxScore: z.coerce
    .number({ error: "Enter a valid maximum score" })
    .int({ error: "Maximum score must be a whole number" })
    .min(1, { error: "Maximum score must be at least 1" })
    .max(1000, { error: "Maximum score cannot exceed 1000" }),
  deadline: z.string({ error: "Deadline is required" }).min(1, { error: "Deadline is required" }),
});

export const caConfigSchema = z.object({
  attendanceWeight: z.coerce
    .number({ error: "Enter a valid attendance weight" })
    .int()
    .min(0)
    .max(100),
  assignmentWeight: z.coerce
    .number({ error: "Enter a valid assignment weight" })
    .int()
    .min(0)
    .max(100),
  testWeight: z.coerce
    .number({ error: "Enter a valid test weight" })
    .int()
    .min(0)
    .max(100),
});

export const manualStudentSchema = z.object({
  fullName: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.FULL_NAME,
    minMessage: "Student name is required",
  }),
  collegeId: optionalSanitizedString(FIELD_LIMITS.COLLEGE_ID),
});

/** Update college ID for an existing manual student. */
export const manualStudentCollegeIdSchema = z.object({
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
  token: z
    .string()
    .min(1, { error: "QR token is required" })
    .max(2048, { error: "QR token is too long" }),
});

export const attendanceStartSchema = z.object({
  classSessionId: uuidField(),
  title: optionalSanitizedString(FIELD_LIMITS.TITLE).optional(),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(MIN_SESSION_DURATION_MINUTES)
    .max(MAX_SESSION_DURATION_MINUTES)
    .default(DEFAULT_SESSION_DURATION_MINUTES),
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
    { error: "Provide all CA weight overrides or none." }
  );

export const testScoresBulkSchema = z.object({
  scores: z
    .array(
      z.object({
        enrollmentId: uuidField(),
        score: z.coerce.number().min(0),
      })
    )
    .max(BULK_GRADE_ENTRY_MAX, {
      error: `Cannot save more than ${BULK_GRADE_ENTRY_MAX} grades at once`,
    })
    .default([]),
  deleteEnrollmentIds: z
    .array(uuidField())
    .max(BULK_GRADE_ENTRY_MAX, {
      error: `Cannot clear more than ${BULK_GRADE_ENTRY_MAX} grades at once`,
    })
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
    .looseObject({
      reference: z.string().max(200).optional(),
      id: z.string().max(200).optional(),
      status: z.string().max(80).optional(),
      paymentStatus: z.string().max(80).optional(),
      metadata: z
        .looseObject({
          payment_id: uuidField().optional(),
          lecturer_id: uuidField().optional(),
          billing_plan: z.enum(["monthly", "semester", "annual"]).optional(),
        })
        .optional(),
    })
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
    { error: "CA weight overrides cannot exceed 100% combined." }
  );

export const contactInquirySchema = z.object({
  fullName: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.FULL_NAME,
    minMessage: "Name is required",
  }),
  email: emailField,
  message: sanitizedRequiredString({
    min: 3,
    max: FIELD_LIMITS.MESSAGE,
    minMessage: "Message is required",
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
    .int({ error: "Expected lecturers must be a whole number" })
    .min(1, { error: "Expected lecturers must be at least 1" })
    .max(10000, { error: "Expected lecturers value is too large" }),
  selectedPackage: z.enum(["small", "medium", "large"]),
  additionalNotes: optionalSanitizedString(FIELD_LIMITS.NOTES),
});

export const partnershipCheckoutSchema = z.object({
  packageId: z.enum(["small", "medium", "large"]),
  universityName: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.UNIVERSITY_NAME,
    minMessage: "University name is required",
  }),
  departmentName: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.DEPARTMENT_NAME,
    minMessage: "Faculty/Department is required",
  }),
  contactPerson: sanitizedRequiredString({
    min: 2,
    max: FIELD_LIMITS.FULL_NAME,
    minMessage: "Contact person is required",
  }),
  email: emailField,
  phoneNumber: requiredPhoneField,
  country: sanitizedRequiredString({
    min: 2,
    max: 80,
    minMessage: "Country is required",
  }),
  paymentMethod: z.enum(["orange_money", "afrimoney", "visa_card"]),
});

export const adminToggleLecturerSchema = z.object({
  lecturerId: uuidField("Invalid lecturer ID"),
  isActive: z.boolean(),
});

export const adminGrantFreeSchema = z.object({
  lecturerId: uuidField("Invalid lecturer ID"),
  days: z.coerce.number().int().min(1).max(3650).default(300),
});

export const adminExtendSubscriptionSchema = z
  .object({
    subscriptionId: uuidField("Invalid subscription ID").optional(),
    lecturerId: uuidField("Invalid lecturer ID").optional(),
    days: z.coerce.number().int().min(1).max(3650).default(30),
  })
  .refine((data) => Boolean(data.lecturerId || data.subscriptionId), {
    error: "lecturerId or subscriptionId required",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ClassSessionInput = z.infer<typeof classSessionSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;
export type PartnershipInquiryInput = z.infer<typeof partnershipInquirySchema>;
export type PartnershipCheckoutInput = z.infer<typeof partnershipCheckoutSchema>;
export type ManualStudentInput = z.infer<typeof manualStudentSchema>;
export type ManualStudentCollegeIdInput = z.infer<typeof manualStudentCollegeIdSchema>;
export type JoinSessionInput = z.infer<typeof joinSessionSchema>;
export type ClassTestInput = z.infer<typeof classTestSchema>;
