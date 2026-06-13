export const CONTACT_EMAIL = "hello@lectrax.com";

export const CONTACT_INQUIRY_STATUSES = ["new", "contacted", "resolved", "closed"] as const;

export type ContactInquiryStatus = (typeof CONTACT_INQUIRY_STATUSES)[number];

export const CONTACT_STATUS_LABELS: Record<ContactInquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  resolved: "Resolved",
  closed: "Closed",
};

export const CONTACT_SUCCESS_MESSAGE =
  "Thank you for reaching out. Our team has received your message and will get back to you shortly.";
