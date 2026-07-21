export const CONTACT_EMAIL = "hello@lectrax.com";

export const CONTACT_SOCIAL_LINKS = [
  { href: "https://facebook.com", label: "Facebook", id: "facebook", handle: "Lectrax" },
  { href: "https://x.com", label: "X", id: "x", handle: "Lectraxofficial" },
  { href: "https://instagram.com", label: "Instagram", id: "instagram", handle: "lectraxofficial" },
  { href: "https://tiktok.com", label: "TikTok", id: "tiktok", handle: "lectrax_official" },
  { href: "https://linkedin.com", label: "LinkedIn", id: "linkedin", handle: "Lectrax" },
] as const;

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
