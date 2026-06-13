import { BookOpen, CreditCard, Home, type LucideIcon } from "lucide-react";

export type LecturerNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  shortLabel?: string;
};

export const LECTURER_NAV_ITEMS: LecturerNavItem[] = [
  { href: "/lecturer", label: "Dashboard", shortLabel: "Home", icon: Home },
  {
    href: "/lecturer/sessions",
    label: "Class Sessions",
    shortLabel: "Sessions",
    icon: BookOpen,
  },
  {
    href: "/lecturer/subscription",
    label: "Subscription",
    shortLabel: "Plan",
    icon: CreditCard,
  },
];

export const LECTURER_SETTINGS_HREF = "/lecturer/settings";

/** Longest matching href wins so `/lecturer` is not active on nested routes. */
export function getActiveLecturerNavHref(pathname: string): string | null {
  const hrefs = LECTURER_NAV_ITEMS.map((item) => item.href);
  const matches = hrefs.filter(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, href) => (href.length > longest.length ? href : longest));
}

export function getLecturerMobilePageTitle(pathname: string): string {
  if (pathname === LECTURER_SETTINGS_HREF || pathname.startsWith(`${LECTURER_SETTINGS_HREF}/`)) {
    return "Settings";
  }

  const activeHref = getActiveLecturerNavHref(pathname);
  if (activeHref) {
    return LECTURER_NAV_ITEMS.find((item) => item.href === activeHref)?.label ?? "Dashboard";
  }

  return "Dashboard";
}
