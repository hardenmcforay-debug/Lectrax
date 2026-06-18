"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Settings, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { signOutAndClearClientStorage } from "@/lib/auth/client-sign-out";
import { STUDENT_SETTINGS_HREF } from "@/lib/student/navigation";

export function StudentMobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="student-mobile-header portal-mobile-header portal-mobile-only z-[60]">
      <div className="portal-mobile-header-bar flex w-full items-center justify-between border-b border-slate-200/80 bg-white/95 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm backdrop-blur-md">
        <Logo href="/student" className="text-primary" iconClassName="h-7 w-7" labelClassName="text-lg" />

        <div className="relative" ref={menuRef}>
          <button
            ref={triggerRef}
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-primary transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>

          {open && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-40 bg-black/20 student-mobile-menu-backdrop"
                onClick={() => setOpen(false)}
              />
              <nav
                role="menu"
                aria-label="Account menu"
                className={cn(
                  "absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[11rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl",
                  "student-mobile-menu-panel"
                )}
              >
                <Link
                  href={STUDENT_SETTINGS_HREF}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                >
                  <Settings className="h-4 w-4 text-primary" aria-hidden />
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="mx-3 mb-3 mt-1 flex w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 active:bg-primary/90"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Log out
                </button>
              </nav>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
