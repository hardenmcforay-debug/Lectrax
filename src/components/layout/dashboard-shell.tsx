import type { ReactNode } from "react";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
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

  return (
    <AdminPortalShell
      title={title}
      description={description}
      headerVariant={headerVariant === "hidden" ? "hidden" : "default"}
    >
      {children}
    </AdminPortalShell>
  );
}
