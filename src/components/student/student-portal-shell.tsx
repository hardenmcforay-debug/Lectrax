"use client";

import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { StudentPageEnter } from "@/components/student/student-portal-motion";
import { StudentBottomNav } from "@/components/student/student-bottom-nav";
import { StudentMobileHeader } from "@/components/student/student-mobile-header";
import { cn } from "@/lib/utils";

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
      <header className="student-header-enter mb-6">
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
        <div
          className={cn(
            "student-portal-content min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
            "px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[calc(4.25rem+env(safe-area-inset-top))]",
            "lg:px-8 lg:pb-8 lg:pt-8"
          )}
        >
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
