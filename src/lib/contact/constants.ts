export const CONTACT_EMAIL = "hello@lectrax.com";

/** Display number and wa.me link (digits only in the URL). */
export const CONTACT_WHATSAPP_NUMBER = "+23270452122";
export const CONTACT_WHATSAPP_HREF = "https://wa.me/23270452122";

export const CONTACT_SOCIAL_LINKS = [
  {
    href: "https://www.facebook.com/profile.php?id=61591527595831",
    label: "Facebook",
    id: "facebook",
    handle: "Lectrax",
  },
  {
    href: "https://x.com/Lectraxofficial",
    label: "X",
    id: "x",
    handle: "Lectraxofficial",
  },
  {
    href: "https://www.instagram.com/lectraxofficial?igsh=MnA1bjR5bHc3YTZt&igsi=MnA1bjR5bHc3YTZt",
    label: "Instagram",
    id: "instagram",
    handle: "lectraxofficial",
  },
  {
    href: "https://www.tiktok.com/@lectrax_official",
    label: "TikTok",
    id: "tiktok",
    handle: "lectrax_official",
  },
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
