import {
  BarChart3,
  ClipboardList,
  Home,
  QrCode,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { StudentNotificationType } from "@/lib/student/notifications";

export type StudentNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  shortLabel?: string;
  notificationType?: StudentNotificationType;
};

export const STUDENT_NAV_ITEMS: StudentNavItem[] = [
  { href: "/student", label: "Dashboard", shortLabel: "Home", icon: Home },
  {
    href: "/student/academic-overview",
    label: "Academic Overview",
    shortLabel: "Overview",
    icon: BarChart3,
    notificationType: "grade",
  },
  { href: "/student/join", label: "Join Class", shortLabel: "Join", icon: Users },
  {
    href: "/student/scan",
    label: "Scan QR",
    shortLabel: "Scan",
    icon: QrCode,
    notificationType: "attendance",
  },
  {
    href: "/student/assignments",
    label: "Assignments",
    shortLabel: "Tasks",
    icon: ClipboardList,
    notificationType: "assignment",
  },
];

export const STUDENT_SETTINGS_HREF = "/student/settings";

/** Longest matching href wins so `/student` is not active on `/student/join`. */
export function getActiveStudentNavHref(pathname: string): string | null {
  const hrefs = STUDENT_NAV_ITEMS.map((item) => item.href);
  const matches = hrefs.filter(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, href) => (href.length > longest.length ? href : longest));
}
