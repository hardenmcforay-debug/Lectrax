"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { usePortalFrame } from "@/components/layout/portal-frame-context";
import { LecturerPageEnter } from "@/components/lecturer/lecturer-portal-motion";
import { LecturerBottomNav } from "@/components/lecturer/lecturer-bottom-nav";
import { LecturerMobileHeader } from "@/components/lecturer/lecturer-mobile-header";
import { cn } from "@/lib/utils";
import { applyPortalChromeMarks } from "@/lib/pwa/portal-chrome";

type LecturerPortalShellProps = {
  title?: string;
  description?: string;
  headerVariant?: "default" | "lecturer-greeting" | "hidden";
  disableEnterAnimation?: boolean;
  children: ReactNode;
};

function LecturerPortalPageBody({
  title,
  description,
  showHeader,
  useGreetingHeader,
  disableEnterAnimation,
  children,
}: {
  title?: string;
  description?: string;
  showHeader: boolean;
  useGreetingHeader: boolean;
  disableEnterAnimation?: boolean;
  children: ReactNode;
}) {
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
    <>
      {desktopHeaderContent}
      {mobilePageDescription}
      {children}
    </>
  );
}

export function LecturerPortalShell({
  title,
  description,
  headerVariant = "default",
  disableEnterAnimation,
  children,
}: LecturerPortalShellProps) {
  const inFrame = usePortalFrame();
  const showHeader = headerVariant !== "hidden";
  const useGreetingHeader = headerVariant === "lecturer-greeting";

  useLayoutEffect(() => {
    if (inFrame) return;
    applyPortalChromeMarks();
    requestAnimationFrame(() => {
      applyPortalChromeMarks();
    });
  }, [inFrame]);

  const pageBody = (
    <LecturerPortalPageBody
      title={title}
      description={description}
      showHeader={showHeader}
      useGreetingHeader={useGreetingHeader}
      disableEnterAnimation={disableEnterAnimation}
    >
      {children}
    </LecturerPortalPageBody>
  );

  // Layout frame already owns chrome + swipe transitions.
  if (inFrame) {
    return <div className="lecturer-portal-page">{pageBody}</div>;
  }

  return (
    <div className="portal-shell-root flex h-dvh min-h-0 overflow-hidden bg-slate-50">
      <DashboardSidebar role="lecturer" className="lecturer-desktop-sidebar hidden lg:flex" />
      <main className="portal-mobile-shell min-h-0 min-w-0 flex-1 overflow-hidden">
        <LecturerMobileHeader />
        <div className="lecturer-portal-content min-h-0 min-w-0">
          <LecturerPageEnter disableEnterAnimation={disableEnterAnimation}>
            {pageBody}
          </LecturerPageEnter>
        </div>
        <LecturerBottomNav />
      </main>
    </div>
  );
}
