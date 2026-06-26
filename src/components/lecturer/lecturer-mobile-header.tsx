"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Settings, X } from "lucide-react";
import { PortalMobileMenu } from "@/components/layout/portal-mobile-menu";
import { cn } from "@/lib/utils";
import { signOutAndClearClientStorage } from "@/lib/auth/client-sign-out";
import {
  getActiveLecturerNavHref,
  getLecturerMobilePageTitle,
  LECTURER_NAV_ITEMS,
  LECTURER_SETTINGS_HREF,
} from "@/lib/lecturer/navigation";

type LecturerMobileHeaderProps = {
  title?: string;
};

export function LecturerMobileHeader({ title }: LecturerMobileHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pageTitle = title ?? getLecturerMobilePageTitle(pathname);
  const activeHref =
    getActiveLecturerNavHref(pathname) ??
    (pathname === LECTURER_SETTINGS_HREF || pathname.startsWith(`${LECTURER_SETTINGS_HREF}/`)
      ? LECTURER_SETTINGS_HREF
      : null);

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

  async function handleLogout() {
    setOpen(false);
    await signOutAndClearClientStorage();
  }

  return (
    <header className="lecturer-mobile-header portal-mobile-header portal-mobile-only z-[60]">
      <div className="portal-mobile-header-bar flex w-full items-center justify-between border-b border-slate-200/80 bg-white/95 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm backdrop-blur-md">
        <h1 className="truncate pr-3 text-lg font-bold text-primary">{pageTitle}</h1>

        <button
          ref={triggerRef}
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-primary transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      <PortalMobileMenu open={open} onClose={() => setOpen(false)} ariaLabel="Lecturer navigation">
        <div className="flex items-center justify-between border-b border-slate-100 px-1 py-3">
          <span className="text-base font-semibold text-primary">Menu</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-50"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 py-3">
          {LECTURER_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeHref === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  "lecturer-nav-link mb-1 flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-700 hover:bg-slate-50"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 border-t border-slate-100 px-1 py-3">
          <Link
            href={LECTURER_SETTINGS_HREF}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(
              "lecturer-nav-link flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              activeHref === LECTURER_SETTINGS_HREF
                ? "bg-primary text-primary-foreground"
                : "text-slate-700 hover:bg-slate-50"
            )}
          >
            <Settings className="h-5 w-5 shrink-0" aria-hidden />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <LogOut className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            Log out
          </button>
        </div>
      </PortalMobileMenu>
    </header>
  );
}
