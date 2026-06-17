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

export const PARTNERSHIP_INQUIRY_STATUSES = [
  "new",
  "contacted",
  "in_discussion",
  "approved",
  "closed",
] as const;

export type PartnershipPackageId = (typeof PARTNERSHIP_PACKAGES)[number]["id"];
export type PartnershipInquiryStatus = (typeof PARTNERSHIP_INQUIRY_STATUSES)[number];

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
