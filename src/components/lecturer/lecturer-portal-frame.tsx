"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { PortalFrameProvider } from "@/components/layout/portal-frame-context";
import { PortalTabSwipe } from "@/components/layout/portal-tab-swipe";
import { LecturerBottomNav } from "@/components/lecturer/lecturer-bottom-nav";
import { LecturerMobileHeader } from "@/components/lecturer/lecturer-mobile-header";
import { getActiveLecturerNavHref, LECTURER_NAV_ITEMS } from "@/lib/lecturer/navigation";
import { applyPortalChromeMarks } from "@/lib/pwa/portal-chrome";

/**
 * Persistent lecturer chrome (sidebar, header, bottom nav, swipe).
 * Mounted from the lecturer layout so tab switches keep shell state alive.
 */
export function LecturerPortalFrame({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    applyPortalChromeMarks();
    requestAnimationFrame(() => {
      applyPortalChromeMarks();
    });
  }, []);

  return (
    <PortalFrameProvider>
      <div className="portal-shell-root flex h-dvh min-h-0 overflow-hidden bg-slate-50">
        <DashboardSidebar role="lecturer" className="lecturer-desktop-sidebar hidden lg:flex" />
        <main className="portal-mobile-shell min-h-0 min-w-0 flex-1 overflow-hidden">
          <LecturerMobileHeader />
          <div className="lecturer-portal-content min-h-0 min-w-0">
            <PortalTabSwipe items={LECTURER_NAV_ITEMS} getActiveHref={getActiveLecturerNavHref}>
              {children}
            </PortalTabSwipe>
          </div>
          <LecturerBottomNav />
        </main>
      </div>
    </PortalFrameProvider>
  );
}
