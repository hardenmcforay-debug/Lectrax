"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { signOutAndClearClientStorage } from "@/lib/auth/client-sign-out";
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
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pageTitle = getAdminMobilePageTitle(pathname, title);
  const activeHref = getActiveAdminNavHref(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await signOutAndClearClientStorage();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="admin-mobile-header portal-mobile-header portal-mobile-only z-[60]">
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

      {open && (
        <>
          <button
            type="button"
            aria-label="Close admin menu"
            className="admin-mobile-menu-backdrop fixed inset-0 z-40 bg-[#0B3D91]/40"
            onClick={() => setOpen(false)}
          />
          <aside
            role="menu"
            aria-label="Admin navigation"
            className={cn(
              "admin-mobile-menu-drawer fixed right-0 top-0 z-50 flex h-full w-[min(20rem,88vw)] flex-col bg-white shadow-2xl",
              "pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
            )}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#0B3D91] to-[#0F4DA8] px-4 py-4">
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

            <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
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
                      "admin-mobile-nav-link mb-1 flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
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

            <div className="border-t border-slate-100 px-3 py-3">
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
              >
                <LogOut className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
                Logout
              </button>
            </div>
          </aside>
        </>
      )}
    </header>
  );
}
