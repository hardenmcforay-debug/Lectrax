import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminTableScrollProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

export function AdminTableScroll({
  children,
  className,
  "aria-label": ariaLabel = "Scrollable data table",
}: AdminTableScrollProps) {
  return (
    <div
      className={cn("admin-table-scroll", className)}
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
