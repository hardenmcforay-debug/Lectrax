"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ErrorFallback } from "@/components/errors/error-fallback";
import type { UserRole } from "@/types/database";

export function ServiceUnavailablePage({
  role = "lecturer",
  title = "Service Temporarily Unavailable",
}: {
  role?: UserRole;
  title?: string;
}) {
  return (
    <DashboardShell role={role} title={title} disableEnterAnimation>
      <ErrorFallback
        category="supabase"
        showReload
        onRetry={() => {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
      />
    </DashboardShell>
  );
}
