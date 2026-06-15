"use client";

import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { AdminMobileHeader } from "@/components/admin/admin-mobile-header";

type AdminPortalShellProps = {
  title?: string;
  description?: string;
  headerVariant?: "default" | "hidden";
  children: ReactNode;
};

export function AdminPortalShell({
  title,
  description,
  headerVariant = "default",
  children,
}: AdminPortalShellProps) {
  const showHeader = headerVariant !== "hidden";

  return (
    <div className="portal-shell-root flex h-dvh min-h-0 overflow-hidden bg-slate-50">
      <DashboardSidebar role="platform_admin" className="admin-desktop-sidebar hidden lg:flex" />
      <main className="portal-mobile-shell flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AdminMobileHeader title={title} />
        {showHeader && title && (
          <div className="admin-desktop-header hidden shrink-0 border-b bg-white px-8 py-5 lg:block xl:py-6">
            <h1 className="text-2xl font-bold text-primary">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        <div className="admin-portal-content min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          {showHeader && description && (
            <p className="portal-page-description lg:hidden">{description}</p>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
