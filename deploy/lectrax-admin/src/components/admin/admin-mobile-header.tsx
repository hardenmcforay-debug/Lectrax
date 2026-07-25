"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { PortalMobileMenu } from "@/components/layout/portal-mobile-menu";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";
import {
  ADMIN_NAV_ITEMS,
  getActiveAdminNavHref,
  getAdminMobilePageTitle,
} from "@/lib/admin/navigation";

type AdminMobileHeaderProps = {
  title?: string;
};

export function AdminMobileHeader({ title }: AdminMobileHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pageTitle = getAdminMobilePageTitle(pathname, title);
  const activeHref = getActiveAdminNavHref(pathname);

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
    <header className="admin-mobile-header portal-mobile-header portal-mobile-only z-40">
      <div className="portal-mobile-header-bar flex w-full items-center justify-between border-b border-slate-200/80 bg-white/95 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm backdrop-blur-md">
        <h1 className="min-w-0 truncate pr-3 text-lg font-bold text-primary">{pageTitle}</h1>

        <button
          ref={triggerRef}
          type="button"
          aria-label={open ? "Close admin menu" : "Open admin menu"}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-primary transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      <PortalMobileMenu open={open} onClose={() => setOpen(false)} ariaLabel="Admin navigation">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#0B3D91] to-[#0F4DA8] px-3 py-4">
          <Logo variant="light" className="gap-2" labelClassName="text-base font-bold" />
          <button
            type="button"
            aria-label="Close admin menu"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 py-3">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  "admin-mobile-nav-link mb-1 flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-700 hover:bg-slate-50"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn("h-5 w-5 shrink-0", active ? "text-emerald-300" : "text-primary")}
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
                {active && (
                  <span
                    className="ml-auto h-2 w-2 shrink-0 rounded-full bg-emerald-400"
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-100 px-1 py-3">
          <LogoutButton
            role="menuitem"
            onBeforeLogout={() => setOpen(false)}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-wait disabled:opacity-50"
          >
            <LogOut className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
            Logout
          </LogoutButton>
        </div>
      </PortalMobileMenu>
    </header>
  );
}
