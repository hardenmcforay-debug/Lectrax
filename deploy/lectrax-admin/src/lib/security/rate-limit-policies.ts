import type { RateLimitRule } from "@/lib/security/rate-limit";

/**
 * Named rate-limit policies for Lectrax API and auth surfaces.
 * Used by middleware (IP-based) and optional route handlers (user-based).
 */
export const RATE_LIMIT_POLICIES = {
  // Public / unauthenticated
  contactForm: { limit: 5, windowMs: 15 * 60_000 },
  partnershipInquiry: { limit: 5, windowMs: 15 * 60_000 },

  // Authentication surfaces
  authCallback: { limit: 20, windowMs: 15 * 60_000 },
  passwordReset: { limit: 5, windowMs: 15 * 60_000 },
  passwordResetEmail: { limit: 3, windowMs: 15 * 60_000 },
  resolveLogin: { limit: 20, windowMs: 15 * 60_000 },
  authLogin: { limit: 20, windowMs: 15 * 60_000 },
  checkPhone: { limit: 10, windowMs: 15 * 60_000 },
  checkSignupIdentifier: { limit: 10, windowMs: 15 * 60_000 },
  finalizePhoneSignup: { limit: 10, windowMs: 15 * 60_000 },
  activatePhoneAccount: { limit: 10, windowMs: 15 * 60_000 },

  // Academic — attendance
  attendanceScan: { limit: 40, windowMs: 60_000 },
  attendanceScanPerUser: { limit: 25, windowMs: 60_000 },
  attendanceMutation: { limit: 60, windowMs: 60_000 },
  studentJoin: { limit: 10, windowMs: 15 * 60_000 },
  deviceRegister: { limit: 10, windowMs: 15 * 60_000 },

  // Academic — grades & CA
  gradeUpdate: { limit: 30, windowMs: 60_000 },
  scoreUpdate: { limit: 30, windowMs: 60_000 },
  assignmentSubmit: { limit: 15, windowMs: 15 * 60_000 },

  // Academic — heavy reads
  studentRows: { limit: 60, windowMs: 60_000 },
  notificationPoll: { limit: 120, windowMs: 60_000 },

  // Payments
  paymentCheckout: { limit: 8, windowMs: 15 * 60_000 },
  paymentStatusPoll: { limit: 60, windowMs: 60_000 },
  subscriptionSync: { limit: 5, windowMs: 60 * 60_000 },
  webhookIngress: { limit: 120, windowMs: 60_000 },

  // Administrative
  adminMutation: { limit: 40, windowMs: 60_000 },
  dataExport: { limit: 10, windowMs: 60 * 60_000 },
  brandingUpload: { limit: 10, windowMs: 15 * 60_000 },

  // General API fallbacks
  apiMutation: { limit: 100, windowMs: 60_000 },
  apiRead: { limit: 200, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;
