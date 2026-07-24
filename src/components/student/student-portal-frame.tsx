"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { PortalFrameProvider } from "@/components/layout/portal-frame-context";
import { PortalTabSwipe } from "@/components/layout/portal-tab-swipe";
import { StudentBottomNav } from "@/components/student/student-bottom-nav";
import { StudentMobileHeader } from "@/components/student/student-mobile-header";
import { StudentNotificationsProvider } from "@/components/student/student-notifications-provider";
import { getActiveStudentNavHref, STUDENT_NAV_ITEMS } from "@/lib/student/navigation";
import { applyPortalChromeMarks } from "@/lib/pwa/portal-chrome";

/**
 * Persistent student chrome (sidebar, header, bottom nav, swipe).
 * Mounted from the student layout so tab switches keep shell state alive.
 */
export function StudentPortalFrame({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    applyPortalChromeMarks();
    requestAnimationFrame(() => {
      applyPortalChromeMarks();
    });
  }, []);

  return (
    <PortalFrameProvider>
      <StudentNotificationsProvider>
        <div className="portal-shell-root flex h-dvh min-h-0 overflow-hidden bg-slate-50">
          <DashboardSidebar role="student" className="student-desktop-sidebar hidden lg:flex" />
          <main className="portal-mobile-shell min-h-0 min-w-0 flex-1 overflow-hidden">
            <StudentMobileHeader />
            <div className="student-portal-content min-h-0 min-w-0">
              <PortalTabSwipe items={STUDENT_NAV_ITEMS} getActiveHref={getActiveStudentNavHref}>
                {children}
              </PortalTabSwipe>
            </div>
            <StudentBottomNav />
          </main>
        </div>
      </StudentNotificationsProvider>
    </PortalFrameProvider>
  );
}
