"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getLecturerMobilePageTitle,
  LECTURER_SETTINGS_HREF,
} from "@/lib/lecturer/navigation";

type LecturerMobileHeaderProps = {
  title?: string;
};

export function LecturerMobileHeader({ title }: LecturerMobileHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pageTitle = title ?? getLecturerMobilePageTitle(pathname);

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
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="lecturer-mobile-header fixed inset-x-0 top-0 z-50 flex lg:hidden">
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

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/30 lecturer-mobile-menu-backdrop"
            onClick={() => setOpen(false)}
          />
          <aside
            role="menu"
            aria-label="Account menu"
            className={cn(
              "fixed right-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl",
              "pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]",
              "lecturer-mobile-menu-drawer"
            )}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <span className="text-sm font-semibold text-primary">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-50"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <nav className="flex flex-1 flex-col px-3 py-4">
              <Link
                href={LECTURER_SETTINGS_HREF}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
              >
                <Settings className="h-4 w-4 text-primary" aria-hidden />
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
              >
                <LogOut className="h-4 w-4 text-primary" aria-hidden />
                Log out
              </button>
            </nav>
          </aside>
        </>
      )}
    </header>
  );
}
