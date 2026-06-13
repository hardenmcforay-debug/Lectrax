"use client";

import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { LecturerPageEnter } from "@/components/lecturer/lecturer-portal-motion";
import { LecturerBottomNav } from "@/components/lecturer/lecturer-bottom-nav";
import { LecturerMobileHeader } from "@/components/lecturer/lecturer-mobile-header";
import { cn } from "@/lib/utils";

type LecturerPortalShellProps = {
  title?: string;
  description?: string;
  headerVariant?: "default" | "lecturer-greeting" | "hidden";
  disableEnterAnimation?: boolean;
  children: ReactNode;
};

export function LecturerPortalShell({
  title,
  description,
  headerVariant = "default",
  disableEnterAnimation,
  children,
}: LecturerPortalShellProps) {
  const showHeader = headerVariant !== "hidden";
  const useGreetingHeader = headerVariant === "lecturer-greeting";

  const desktopHeaderClass =
    !disableEnterAnimation ? "lecturer-header-enter mb-6" : "mb-6";

  const desktopHeaderContent =
    showHeader && title ? (
      useGreetingHeader ? (
        <header className={cn(desktopHeaderClass, "hidden lg:block")}>
          <h1 className="text-xl font-semibold leading-tight text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground sm:line-clamp-none sm:text-sm">
              {description}
            </p>
          )}
        </header>
      ) : (
        <header className={cn(desktopHeaderClass, "hidden lg:block")}>
          <h1 className="text-xl font-bold text-primary">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </header>
      )
    ) : null;

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      <DashboardSidebar role="lecturer" className="lecturer-desktop-sidebar hidden lg:flex" />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <LecturerMobileHeader />
        <div
          className={cn(
            "lecturer-portal-content min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
            "px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-[calc(4.25rem+env(safe-area-inset-top))]",
            "lg:px-5 lg:pb-5 lg:pt-5"
          )}
        >
          <LecturerPageEnter disableEnterAnimation={disableEnterAnimation}>
            {desktopHeaderContent}
            {children}
          </LecturerPageEnter>
        </div>
        <LecturerBottomNav />
      </main>
    </div>
  );
}
