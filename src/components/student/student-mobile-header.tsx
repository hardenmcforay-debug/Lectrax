"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Settings, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { PortalMobileMenu } from "@/components/layout/portal-mobile-menu";
import { NavNotificationBadge } from "@/components/student/nav-notification-badge";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";
import { HERO_LUCIDE_ICON_PROPS } from "@/lib/ui/hero-lucide-icon";
import {
  getActiveStudentNavHref,
  STUDENT_NAV_ITEMS,
  STUDENT_SETTINGS_HREF,
} from "@/lib/student/navigation";
import { useStudentNotifications } from "@/components/student/student-notifications-provider";

export function StudentMobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeHref =
    getActiveStudentNavHref(pathname) ??
    (pathname === STUDENT_SETTINGS_HREF || pathname.startsWith(`${STUDENT_SETTINGS_HREF}/`)
      ? STUDENT_SETTINGS_HREF
      : null);
  const { counts } = useStudentNotifications();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <header className="student-mobile-header portal-mobile-header portal-mobile-only z-40">
      <div className="portal-mobile-header-bar flex w-full items-center justify-between border-b border-slate-200/80 bg-white/95 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm backdrop-blur-md">
        <Logo href="/student" className="text-primary" iconClassName="h-7 w-7" labelClassName="text-lg" />

        <button
          ref={triggerRef}
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-primary transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {open ? (
            <X {...HERO_LUCIDE_ICON_PROPS} className="h-5 w-5 text-primary" aria-hidden />
          ) : (
            <Menu {...HERO_LUCIDE_ICON_PROPS} className="h-5 w-5 text-primary" aria-hidden />
          )}
        </button>
      </div>

      <PortalMobileMenu
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="Student navigation"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-1 py-3">
          <Logo href="/student" className="text-primary" iconClassName="h-7 w-7" labelClassName="text-lg" />
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-50"
          >
            <X {...HERO_LUCIDE_ICON_PROPS} className="h-5 w-5 text-emerald-500" aria-hidden />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 py-3">
          {STUDENT_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeHref === item.href;
            const badgeCount = item.notificationType ? counts[item.notificationType] : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  "student-nav-link mb-1 flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-700 hover:bg-slate-50"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  {...HERO_LUCIDE_ICON_PROPS}
                  className={cn("h-5 w-5 shrink-0", !active && "text-emerald-500")}
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
                <NavNotificationBadge count={badgeCount} />
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 border-t border-slate-100 px-1 py-3">
          <Link
            href={STUDENT_SETTINGS_HREF}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(
              "student-nav-link flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              activeHref === STUDENT_SETTINGS_HREF
                ? "bg-primary text-primary-foreground"
                : "text-slate-700 hover:bg-slate-50"
            )}
          >
            <Settings
              {...HERO_LUCIDE_ICON_PROPS}
              className={cn(
                "h-5 w-5 shrink-0",
                activeHref !== STUDENT_SETTINGS_HREF && "text-emerald-500"
              )}
              aria-hidden
            />
            Settings
          </Link>
          <LogoutButton
            role="menuitem"
            onBeforeLogout={() => setOpen(false)}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-50"
          >
            <LogOut {...HERO_LUCIDE_ICON_PROPS} className="h-4 w-4" aria-hidden />
            Log out
          </LogoutButton>
        </div>
      </PortalMobileMenu>
    </header>
  );
}
