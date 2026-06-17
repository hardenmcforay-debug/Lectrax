"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings, LogOut } from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getActiveStudentNavHref,
  STUDENT_NAV_ITEMS,
  STUDENT_SETTINGS_HREF,
  type StudentNavItem,
} from "@/lib/student/navigation";
import {
  getActiveLecturerNavHref,
  LECTURER_NAV_ITEMS,
  LECTURER_SETTINGS_HREF,
} from "@/lib/lecturer/navigation";
import { ADMIN_NAV_ITEMS, getActiveAdminNavHref } from "@/lib/admin/navigation";
import type { UserRole } from "@/types/database";
import { SidebarNotificationBadge } from "@/components/student/nav-notification-badge";
import { useStudentNotifications } from "@/components/student/student-notifications-provider";

const NAV_BY_ROLE: Record<UserRole, typeof LECTURER_NAV_ITEMS> = {
  lecturer: LECTURER_NAV_ITEMS,
  student: STUDENT_NAV_ITEMS,
  platform_admin: ADMIN_NAV_ITEMS,
};

/** Longest matching href wins so parent routes are not active on nested paths. */
function getActiveNavHref(pathname: string, hrefs: string[]): string | null {
  const matches = hrefs.filter(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, href) => (href.length > longest.length ? href : longest));
}

export function DashboardSidebar({
  role,
  className,
}: {
  role: UserRole;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = NAV_BY_ROLE[role];
  const { counts: studentNotificationCounts } = useStudentNotifications();
  const isLecturer = role === "lecturer";
  const isStudent = role === "student";
  const isAdmin = role === "platform_admin";
  const footerSettingsHref = isStudent
    ? STUDENT_SETTINGS_HREF
    : isLecturer
      ? LECTURER_SETTINGS_HREF
      : null;
  const activeHref = isStudent
    ? getActiveStudentNavHref(pathname) ??
      (pathname === STUDENT_SETTINGS_HREF || pathname.startsWith(`${STUDENT_SETTINGS_HREF}/`)
        ? STUDENT_SETTINGS_HREF
        : null)
    : isLecturer
      ? getActiveLecturerNavHref(pathname) ??
        (pathname === LECTURER_SETTINGS_HREF || pathname.startsWith(`${LECTURER_SETTINGS_HREF}/`)
          ? LECTURER_SETTINGS_HREF
          : null)
      : isAdmin
        ? getActiveAdminNavHref(pathname)
        : getActiveNavHref(
            pathname,
            footerSettingsHref
              ? [...nav.map((n) => n.href), footerSettingsHref]
              : nav.map((n) => n.href)
          );

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "h-full shrink-0 flex-col border-r bg-white",
        isLecturer ? "w-[13.5rem]" : "w-64",
        className ?? "flex"
      )}
    >
      <div className={cn(isAdmin && "border-b", isLecturer ? "px-3 py-3" : "p-4")}>
        <Logo
          href={nav[0]?.href ?? "/"}
          className={isLecturer ? "gap-1.5" : undefined}
          iconClassName={isLecturer ? "h-6 w-6" : undefined}
          labelClassName={isLecturer ? "text-base" : undefined}
        />
      </div>
      <nav
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          isLecturer ? "space-y-1.5 p-2" : "space-y-1 p-4"
        )}
      >
        {nav.map((item) => {
          const Icon = item.icon;
          const active = activeHref === item.href;
          const studentItem = isStudent ? (item as StudentNavItem) : null;
          const notificationCount = studentItem?.notificationType
            ? studentNotificationCounts[studentItem.notificationType]
            : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active ? "true" : "false"}
              className={cn(
                "flex items-center rounded-lg font-medium",
                isStudent && "student-nav-link",
                isLecturer && "lecturer-nav-link",
                !isStudent && !isLecturer && "transition-colors",
                isLecturer
                  ? "gap-2 px-2.5 py-1.5 text-sm leading-none"
                  : "gap-3 px-3 py-2 text-sm",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={isLecturer ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4"} />
              <span className={cn("truncate", isLecturer && "leading-none")}>{item.label}</span>
              {isStudent ? <SidebarNotificationBadge count={notificationCount} /> : null}
            </Link>
          );
        })}
      </nav>
      <div
        className={cn(
          "border-t",
          isLecturer ? "space-y-1.5 p-2" : "space-y-1 p-4"
        )}
      >
        {isLecturer && (
          <Link
            href={LECTURER_SETTINGS_HREF}
            data-active={activeHref === LECTURER_SETTINGS_HREF ? "true" : "false"}
            className={cn(
              "lecturer-nav-link flex w-full items-center rounded-lg font-medium",
              "gap-2 px-2.5 py-1.5 text-sm leading-none",
              activeHref === LECTURER_SETTINGS_HREF
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate leading-none">Settings</span>
          </Link>
        )}
        {isStudent && (
          <Link
            href={STUDENT_SETTINGS_HREF}
            data-active={activeHref === STUDENT_SETTINGS_HREF ? "true" : "false"}
            className={cn(
              "student-nav-link flex w-full items-center rounded-lg font-medium",
              "gap-3 px-3 py-2 text-sm",
              activeHref === STUDENT_SETTINGS_HREF
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </Link>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center rounded-lg text-muted-foreground hover:bg-muted",
            isLecturer && "lecturer-nav-link",
            isLecturer ? "gap-2 px-2.5 py-1.5 text-sm leading-none" : "gap-3 px-3 py-2 text-sm"
          )}
        >
          <LogOut className={isLecturer ? "h-3.5 w-3.5" : "h-4 w-4"} />
          Log out
        </button>
      </div>
    </aside>
  );
}
