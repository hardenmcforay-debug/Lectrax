import type { RateLimitRule } from "@/lib/security/rate-limit";

/**
 * Named rate-limit policies for Lectrax API and auth surfaces.
 *
 * - Middleware applies per-IP policies.
 * - Route handlers apply per-user / per-device / per-identifier policies.
 * - `burst` adds a short sliding window to stop spikes without hurting normal use.
 * - Sensitive policies fail closed if Redis is unavailable.
 */
export const RATE_LIMIT_POLICIES = {
  // Browser CSP violation reports (Report-Only / enforce collectors)
  cspReport: {
    limit: 60,
    windowMs: 60_000,
    burst: { limit: 20, windowMs: 10_000 },
    failMode: "open",
  },

  // Public / unauthenticated
  contactForm: {
    limit: 5,
    windowMs: 15 * 60_000,
    burst: { limit: 2, windowMs: 30_000 },
    failMode: "closed",
  },
  partnershipInquiry: {
    limit: 5,
    windowMs: 15 * 60_000,
    burst: { limit: 2, windowMs: 30_000 },
    failMode: "closed",
  },

  // Authentication surfaces
  authCallback: {
    limit: 20,
    windowMs: 15 * 60_000,
    burst: { limit: 5, windowMs: 30_000 },
    failMode: "closed",
  },
  /** Per-IP login (middleware). */
  authLoginIp: {
    limit: 30,
    windowMs: 15 * 60_000,
    burst: { limit: 5, windowMs: 10_000 },
    failMode: "closed",
  },
  /** Per-identifier login (route). */
  authLogin: {
    limit: 20,
    windowMs: 15 * 60_000,
    burst: { limit: 5, windowMs: 60_000 },
    failMode: "closed",
  },
  /** Per-IP registration helpers (middleware). */
  authRegistrationIp: {
    limit: 20,
    windowMs: 15 * 60_000,
    burst: { limit: 5, windowMs: 30_000 },
    failMode: "closed",
  },
  passwordReset: {
    limit: 5,
    windowMs: 15 * 60_000,
    burst: { limit: 2, windowMs: 60_000 },
    failMode: "closed",
  },
  passwordResetEmail: {
    limit: 3,
    windowMs: 15 * 60_000,
    burst: { limit: 1, windowMs: 60_000 },
    failMode: "closed",
  },
  resolveLogin: {
    limit: 20,
    windowMs: 15 * 60_000,
    burst: { limit: 5, windowMs: 30_000 },
    failMode: "closed",
  },
  checkPhone: {
    limit: 10,
    windowMs: 15 * 60_000,
    burst: { limit: 3, windowMs: 30_000 },
    failMode: "closed",
  },
  checkSignupIdentifier: {
    limit: 10,
    windowMs: 15 * 60_000,
    burst: { limit: 3, windowMs: 30_000 },
    failMode: "closed",
  },
  finalizePhoneSignup: {
    limit: 10,
    windowMs: 15 * 60_000,
    failMode: "closed",
  },
  /** Phone activation / email-confirmation style unlock. */
  activatePhoneAccount: {
    limit: 10,
    windowMs: 15 * 60_000,
    burst: { limit: 3, windowMs: 60_000 },
    failMode: "closed",
  },
  emailVerification: {
    limit: 10,
    windowMs: 15 * 60_000,
    burst: { limit: 3, windowMs: 60_000 },
    failMode: "closed",
  },

  // Academic — attendance / QR
  attendanceScan: {
    limit: 40,
    windowMs: 60_000,
    burst: { limit: 10, windowMs: 10_000 },
    failMode: "closed",
  },
  attendanceScanPerUser: {
    limit: 25,
    windowMs: 60_000,
    burst: { limit: 8, windowMs: 10_000 },
    failMode: "closed",
  },
  attendanceScanPerDevice: {
    limit: 30,
    windowMs: 60_000,
    burst: { limit: 8, windowMs: 10_000 },
    failMode: "closed",
  },
  /** Failed / invalid QR token verification attempts. */
  qrVerification: {
    limit: 40,
    windowMs: 60_000,
    burst: { limit: 10, windowMs: 10_000 },
    failMode: "closed",
  },
  attendanceMutation: {
    limit: 60,
    windowMs: 60_000,
    burst: { limit: 15, windowMs: 10_000 },
    failMode: "closed",
  },
  studentJoin: {
    limit: 10,
    windowMs: 15 * 60_000,
    burst: { limit: 3, windowMs: 60_000 },
    failMode: "closed",
  },
  deviceRegister: {
    limit: 10,
    windowMs: 15 * 60_000,
    burst: { limit: 3, windowMs: 60_000 },
    failMode: "closed",
  },

  // Academic — grades & uploads
  gradeUpdate: {
    limit: 30,
    windowMs: 60_000,
    burst: { limit: 10, windowMs: 10_000 },
    failMode: "closed",
  },
  scoreUpdate: {
    limit: 30,
    windowMs: 60_000,
    burst: { limit: 10, windowMs: 10_000 },
    failMode: "closed",
  },
  assignmentSubmit: {
    limit: 15,
    windowMs: 15 * 60_000,
    burst: { limit: 3, windowMs: 60_000 },
    failMode: "closed",
  },
  assignmentSubmitPerUser: {
    limit: 10,
    windowMs: 15 * 60_000,
    burst: { limit: 2, windowMs: 60_000 },
    failMode: "closed",
  },
  fileUpload: {
    limit: 15,
    windowMs: 15 * 60_000,
    burst: { limit: 3, windowMs: 60_000 },
    failMode: "closed",
  },

  // Academic — heavy reads
  studentRows: {
    limit: 60,
    windowMs: 60_000,
    failMode: "open",
  },
  notificationPoll: {
    limit: 120,
    windowMs: 60_000,
    failMode: "open",
  },

  // Payments & subscription
  paymentCheckout: {
    limit: 20,
    windowMs: 15 * 60_000,
    burst: { limit: 3, windowMs: 60_000 },
    failMode: "closed",
  },
  paymentCheckoutPerUser: {
    limit: 10,
    windowMs: 15 * 60_000,
    burst: { limit: 2, windowMs: 60_000 },
    failMode: "closed",
  },
  paymentStatusPoll: {
    limit: 60,
    windowMs: 60_000,
    burst: { limit: 15, windowMs: 10_000 },
    failMode: "open",
  },
  subscriptionSync: {
    limit: 5,
    windowMs: 60 * 60_000,
    burst: { limit: 2, windowMs: 60_000 },
    failMode: "closed",
  },
  webhookIngress: {
    limit: 120,
    windowMs: 60_000,
    burst: { limit: 40, windowMs: 10_000 },
    failMode: "closed",
  },

  // Account lifecycle
  accountDeletion: {
    limit: 3,
    windowMs: 60 * 60_000,
    failMode: "closed",
  },

  // Administrative
  adminMutation: {
    limit: 40,
    windowMs: 60_000,
    burst: { limit: 10, windowMs: 10_000 },
    failMode: "closed",
  },
  adminMutationPerUser: {
    limit: 30,
    windowMs: 60_000,
    burst: { limit: 8, windowMs: 10_000 },
    failMode: "closed",
  },
  dataExport: {
    limit: 10,
    windowMs: 60 * 60_000,
    failMode: "closed",
  },
  brandingUpload: {
    limit: 10,
    windowMs: 15 * 60_000,
    burst: { limit: 3, windowMs: 60_000 },
    failMode: "closed",
  },

  // General API fallbacks
  apiMutation: {
    limit: 100,
    windowMs: 60_000,
    burst: { limit: 30, windowMs: 10_000 },
    failMode: "open",
  },
  apiRead: {
    limit: 200,
    windowMs: 60_000,
    burst: { limit: 60, windowMs: 10_000 },
    failMode: "open",
  },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;
