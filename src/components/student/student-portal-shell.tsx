"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { usePortalFrame } from "@/components/layout/portal-frame-context";
import { StudentPageEnter } from "@/components/student/student-portal-motion";
import { StudentBottomNav } from "@/components/student/student-bottom-nav";
import { StudentMobileHeader } from "@/components/student/student-mobile-header";
import { StudentNotificationsProvider } from "@/components/student/student-notifications-provider";
import { applyPortalChromeMarks } from "@/lib/pwa/portal-chrome";

type StudentPortalShellProps = {
  title?: string;
  description?: string;
  headerVariant?: "default" | "hidden";
  children: ReactNode;
};

function StudentPortalPageBody({
  title,
  description,
  showHeader,
  children,
}: {
  title?: string;
  description?: string;
  showHeader: boolean;
  children: ReactNode;
}) {
  const inlineHeaderContent =
    showHeader && title ? (
      <header className="student-header-enter portal-page-header">
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </header>
    ) : null;

  return (
    <>
      {inlineHeaderContent}
      {children}
    </>
  );
}

export function StudentPortalShell({
  title,
  description,
  headerVariant = "default",
  children,
}: StudentPortalShellProps) {
  const inFrame = usePortalFrame();
  const showHeader = headerVariant !== "hidden";

  useLayoutEffect(() => {
    if (inFrame) return;
    applyPortalChromeMarks();
    requestAnimationFrame(() => {
      applyPortalChromeMarks();
    });
  }, [inFrame]);

  const pageBody = (
    <StudentPortalPageBody title={title} description={description} showHeader={showHeader}>
      {children}
    </StudentPortalPageBody>
  );

  // Layout frame already owns chrome + swipe transitions.
  if (inFrame) {
    return <div className="student-portal-page">{pageBody}</div>;
  }

  return (
    <StudentNotificationsProvider>
      <div className="portal-shell-root flex h-dvh min-h-0 overflow-hidden bg-slate-50">
        <DashboardSidebar role="student" className="student-desktop-sidebar hidden lg:flex" />
        <main className="portal-mobile-shell min-h-0 min-w-0 flex-1 overflow-hidden">
          <StudentMobileHeader />
          <div className="student-portal-content min-h-0 min-w-0">
            <StudentPageEnter>{pageBody}</StudentPageEnter>
          </div>
          <StudentBottomNav />
        </main>
      </div>
    </StudentNotificationsProvider>
  );
}
