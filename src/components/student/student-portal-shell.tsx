"use client";

import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { StudentPageEnter } from "@/components/student/student-portal-motion";
import { StudentBottomNav } from "@/components/student/student-bottom-nav";
import { StudentMobileHeader } from "@/components/student/student-mobile-header";

type StudentPortalShellProps = {
  title?: string;
  description?: string;
  headerVariant?: "default" | "hidden";
  children: ReactNode;
};

export function StudentPortalShell({
  title,
  description,
  headerVariant = "default",
  children,
}: StudentPortalShellProps) {
  const showHeader = headerVariant !== "hidden";

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
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      <DashboardSidebar role="student" className="student-desktop-sidebar hidden lg:flex" />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <StudentMobileHeader />
        <div className="student-portal-content min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <StudentPageEnter>
            {inlineHeaderContent}
            {children}
          </StudentPageEnter>
        </div>
        <StudentBottomNav />
      </main>
    </div>
  );
}
