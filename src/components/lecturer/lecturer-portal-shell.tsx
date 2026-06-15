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
    !disableEnterAnimation ? "lecturer-header-enter portal-page-header" : "portal-page-header";

  const mobilePageDescription =
    showHeader && description ? (
      <p className="portal-page-description lg:hidden">{description}</p>
    ) : null;

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
    <div className="portal-shell-root flex h-dvh min-h-0 overflow-hidden bg-slate-50">
      <DashboardSidebar role="lecturer" className="lecturer-desktop-sidebar hidden lg:flex" />
      <main className="portal-mobile-shell min-h-0 min-w-0 flex-1 overflow-hidden">
        <LecturerMobileHeader />
        <div className="lecturer-portal-content min-h-0 min-w-0">
          <LecturerPageEnter disableEnterAnimation={disableEnterAnimation}>
            {desktopHeaderContent}
            {mobilePageDescription}
            {children}
          </LecturerPageEnter>
        </div>
        <LecturerBottomNav />
      </main>
    </div>
  );
}
