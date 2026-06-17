import type { ReactNode } from "react";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
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
  void role;
  void disableEnterAnimation;

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
