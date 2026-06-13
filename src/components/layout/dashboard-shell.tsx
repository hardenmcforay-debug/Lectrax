import type { ReactNode } from "react";
import { DashboardSidebar } from "./dashboard-sidebar";
import { LecturerPortalShell } from "@/components/lecturer/lecturer-portal-shell";
import { StudentPortalShell } from "@/components/student/student-portal-shell";
import type { UserRole } from "@/types/database";

export function DashboardShell({
  role,
  title,
  description,
  headerVariant = "default",
  disableEnterAnimation,
  children,
}: {
  role: UserRole;
  title?: string;
  description?: string;
  headerVariant?: "default" | "lecturer-greeting" | "hidden";
  disableEnterAnimation?: boolean;
  children: ReactNode;
}) {
  if (role === "student") {
    return (
      <StudentPortalShell
        title={title}
        description={description}
        headerVariant={headerVariant === "hidden" ? "hidden" : "default"}
      >
        {children}
      </StudentPortalShell>
    );
  }

  if (role === "lecturer") {
    return (
      <LecturerPortalShell
        title={title}
        description={description}
        headerVariant={headerVariant}
        disableEnterAnimation={disableEnterAnimation}
      >
        {children}
      </LecturerPortalShell>
    );
  }

  const showHeader = headerVariant !== "hidden";

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      <DashboardSidebar role={role} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {showHeader && title && (
          <div className="shrink-0 border-b bg-white px-8 py-6">
            <h1 className="text-2xl font-bold text-primary">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-8">{children}</div>
      </main>
    </div>
  );
}
