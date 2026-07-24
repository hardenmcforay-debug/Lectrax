export const PARTNERSHIP_PACKAGES = [
  {
    id: "small" as const,
    name: "Small Package",
    lecturerLimit: 10,
    price: 350,
    recommended: false,
  },
  {
    id: "medium" as const,
    name: "Medium Package",
    lecturerLimit: 25,
    price: 750,
    recommended: true,
  },
  {
    id: "large" as const,
    name: "Large Package",
    lecturerLimit: 50,
    price: 1400,
    recommended: false,
  },
];

/** Payment checkout packages with full feature lists for the partnerships page. */
export const PARTNERSHIP_PAYMENT_PACKAGES = [
  {
    id: "small" as const,
    name: "Small Package",
    price: 350,
    billingCycle: "Academic Year" as const,
    lecturerLimit: 10,
    description: "Suitable for departments with up to 10 lecturers.",
    popular: false,
    includesLabel: "Includes:",
    features: [
      "Up to 10 Lecturer Accounts",
      "QR Attendance",
      "Continuous Assessment",
      "Assignment Management",
      "Performance Analytics",
    ],
  },
  {
    id: "medium" as const,
    name: "Medium Package",
    price: 750,
    billingCycle: "Academic Year" as const,
    lecturerLimit: 25,
    description: "Suitable for departments with up to 25 lecturers.",
    popular: true,
    includesLabel: "Includes:",
    features: [
      "Up to 25 Lecturer Accounts",
      "QR Attendance",
      "Continuous Assessment",
      "Assignment Management",
      "Performance Analytics",
    ],
  },
  {
    id: "large" as const,
    name: "Large Package",
    price: 1400,
    billingCycle: "Academic Year" as const,
    lecturerLimit: 50,
    description: "Suitable for departments with up to 50 lecturers.",
    popular: false,
    includesLabel: "Includes:",
    features: [
      "Up to 50 Lecturer Accounts",
      "QR Attendance",
      "Continuous Assessment",
      "Assignment Management",
      "Performance Analytics",
    ],
  },
] as const;

/**
 * Default Monime charge amounts in SLE (major units).
 * Aligned to ~24 SLE per USD based on lecturer Premium pricing.
 * Override with MONIME_AMOUNT_PARTNERSHIP_SMALL / _MEDIUM / _LARGE.
 */
export const DEFAULT_PARTNERSHIP_SLE_AMOUNTS: Record<PartnershipPackageId, number> = {
  small: 8400,
  medium: 18000,
  large: 33600,
};

export const PARTNERSHIP_INQUIRY_STATUSES = [
  "new",
  "contacted",
  "in_discussion",
  "approved",
  "closed",
] as const;

export type PartnershipPackageId = (typeof PARTNERSHIP_PACKAGES)[number]["id"];
export type PartnershipInquiryStatus = (typeof PARTNERSHIP_INQUIRY_STATUSES)[number];
export type PartnershipPaymentPackage = (typeof PARTNERSHIP_PAYMENT_PACKAGES)[number];

export const PARTNERSHIP_STATUS_LABELS: Record<PartnershipInquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  in_discussion: "In Discussion",
  approved: "Approved",
  closed: "Closed",
};

export const PARTNERSHIP_BENEFITS = [
  "Department-wide lecturer access",
  "Dedicated onboarding support",
  "Centralized academic management",
  "Secure academic records",
  "Modern attendance and assessment tools",
  "Scalable for growing departments",
];

export const PARTNERSHIP_SUCCESS_MESSAGE =
  "Thank you for your interest in Lectrax. Our team will review your request and contact you shortly to discuss onboarding and departmental setup.";

export const PARTNERSHIP_PAYMENT_SUCCESS_MESSAGE =
  "Thank you for partnering with Lectrax. Our team will contact you shortly to begin onboarding your institution.";

export function getPartnershipPaymentPackage(
  id: PartnershipPackageId
): PartnershipPaymentPackage | undefined {
  return PARTNERSHIP_PAYMENT_PACKAGES.find((pkg) => pkg.id === id);
}
