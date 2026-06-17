import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z
  .object({
    fullName: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
    role: z.enum(["lecturer", "student"]),
    collegeId: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const classSessionSchema = z.object({
  className: z.string().min(2, "Class is required"),
  title: z.string().min(2, "Course title is required"),
  courseCode: z.string().min(2, "Course code is required"),
  semester: z.enum(["first_semester", "second_semester", "full_year"]),
  academicYear: z.string().min(4, "Academic year is required"),
});

export const assignmentSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  maxScore: z.coerce.number().min(1).max(100),
  deadline: z.string().min(1),
});

export const caConfigSchema = z.object({
  attendanceWeight: z.coerce.number().min(0).max(100),
  assignmentWeight: z.coerce.number().min(0).max(100),
  testWeight: z.coerce.number().min(0).max(100),
});

export const manualStudentSchema = z.object({
  fullName: z.string().min(2),
  collegeId: z.string().optional(),
});

export const joinSessionSchema = z.object({
  sessionCode: z.string().min(4).max(10),
});

export const classTestSchema = z.object({
  testNumber: z.union([z.literal(1), z.literal(2)]),
  title: z.string().min(1, "Test name is required").max(120),
  maxScore: z.coerce.number().min(1).max(1000),
  weightPercent: z.coerce.number().min(0).max(100).optional().nullable(),
});

export const testScoresBulkSchema = z.object({
  scores: z
    .array(
      z.object({
        enrollmentId: z.string().uuid(),
        score: z.coerce.number().min(0),
      })
    )
    .default([]),
  deleteEnrollmentIds: z.array(z.string().uuid()).optional(),
});

export const contactInquirySchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export const partnershipInquirySchema = z.object({
  universityName: z.string().min(2, "University name is required"),
  departmentName: z.string().min(2, "Department name is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  positionRole: z.string().min(2, "Position or role is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(6, "Phone number is required"),
  expectedLecturers: z.coerce
    .number()
    .int("Expected lecturers must be a whole number")
    .min(1, "Expected lecturers must be at least 1"),
  selectedPackage: z.enum(["small", "medium", "large"]),
  additionalNotes: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ClassSessionInput = z.infer<typeof classSessionSchema>;
export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;
export type PartnershipInquiryInput = z.infer<typeof partnershipInquirySchema>;
