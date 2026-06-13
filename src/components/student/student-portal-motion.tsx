"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function StudentPageEnter({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="student-page-enter student-stagger">
      {children}
    </div>
  );
}
