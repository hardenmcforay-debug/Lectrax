import {
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  DollarSign,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/lecturers", label: "Lecturers", icon: Users },
  { href: "/admin/students", label: "Students", icon: GraduationCap },
  { href: "/admin/partnerships", label: "Partnerships", icon: Building2 },
  { href: "/admin/contact", label: "Contact", icon: Mail },
  { href: "/admin/landing", label: "Logo & Landing", icon: Sparkles },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/payments", label: "Payments", icon: DollarSign },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/audit", label: "Audit Logs", icon: ClipboardList },
];

export { LogOut as ADMIN_LOGOUT_ICON };

/** Longest matching href wins so `/admin` is not active on nested routes. */
export function getActiveAdminNavHref(pathname: string): string | null {
  const hrefs = ADMIN_NAV_ITEMS.map((item) => item.href);
  const matches = hrefs.filter(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, href) => (href.length > longest.length ? href : longest));
}

export function getAdminMobilePageTitle(pathname: string, fallback?: string): string {
  const activeHref = getActiveAdminNavHref(pathname);
  if (activeHref) {
    return ADMIN_NAV_ITEMS.find((item) => item.href === activeHref)?.label ?? fallback ?? "Dashboard";
  }
  return fallback ?? "Dashboard";
}
